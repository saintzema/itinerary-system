from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
from dotenv import load_dotenv
import logging
from contextlib import asynccontextmanager
import sys
import openai
import json
import re

# Import database components
from database import get_db, create_tables, User, Event, Notification

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 30  # 30 days

# Initialize OpenAI client
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
    logger.info("OpenAI API key configured successfully")
else:
    logger.warning("OpenAI API key not found. Natural language processing will not be available.")

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        create_tables()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Application shutting down")

# Create FastAPI app
app = FastAPI(
    title="Itinerary Management System API",
    description="A simple event scheduling system with SQLite/PostgreSQL",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

# Pydantic models
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="user", pattern="^(admin|staff|user)$")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str

class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    start_time: datetime
    end_time: datetime
    venue: Optional[str] = Field(None, max_length=200)
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    recurrence: str = Field(default="none", pattern="^(none|daily|weekly|monthly)$")
    recurrence_end_date: Optional[datetime] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    reference_id: Optional[str]
    status: str
    created_at: datetime
    read_at: Optional[datetime]

# New models for advanced features
class NaturalLanguageEventRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)

class ParsedEventResponse(BaseModel):
    title: Optional[str]
    description: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    venue: Optional[str]
    priority: Optional[str] = "medium"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    raw_text: str

class ConflictCheckRequest(BaseModel):
    start_time: datetime
    end_time: datetime
    event_id: Optional[str] = None  # For updates, exclude this event from conflict check

class ConflictingEvent(BaseModel):
    id: str
    title: str
    start_time: datetime
    end_time: datetime
    priority: str

class TimeSlot(BaseModel):
    start_time: datetime
    end_time: datetime
    date: str
    time_range: str

class ConflictCheckResponse(BaseModel):
    has_conflict: bool
    conflicts: List[ConflictingEvent]
    suggested_slots: List[TimeSlot]
    buffer_time_minutes: int = 15

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user

# Background tasks
def create_notification(db: Session, user_id: str, title: str, message: str, notification_type: str, reference_id: str = None):
    """Create a notification for a user"""
    try:
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            reference_id=reference_id,
            status="unread",
            created_at=datetime.utcnow()
        )
        db.add(notification)
        db.commit()
        logger.info(f"Notification created for user {user_id}: {title}")
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        db.rollback()

# Advanced helper functions for new features
def check_event_conflicts(db: Session, user_id: str, start_time: datetime, end_time: datetime, exclude_event_id: str = None, buffer_minutes: int = 15):
    """Check for event conflicts with optional buffer time"""
    try:
        # Add buffer time to the requested time slot
        buffer_start = start_time - timedelta(minutes=buffer_minutes)
        buffer_end = end_time + timedelta(minutes=buffer_minutes)
        
        # Query for conflicting events
        query = db.query(Event).filter(
            Event.created_by == user_id,
            # Check for overlap: (start < other_end AND end > other_start)
            Event.start_time < buffer_end,
            Event.end_time > buffer_start
        )
        
        # Exclude the current event if updating
        if exclude_event_id:
            query = query.filter(Event.id != exclude_event_id)
        
        conflicting_events = query.all()
        
        conflicts = [
            ConflictingEvent(
                id=event.id,
                title=event.title,
                start_time=event.start_time,
                end_time=event.end_time,
                priority=event.priority
            )
            for event in conflicting_events
        ]
        
        return conflicts
    except Exception as e:
        logger.error(f"Error checking event conflicts: {e}")
        return []

def suggest_alternative_time_slots(db: Session, user_id: str, start_time: datetime, end_time: datetime, num_suggestions: int = 3):
    """Suggest alternative time slots when conflicts exist"""
    try:
        duration = end_time - start_time
        suggestions = []
        
        # Get all user's events to find free slots
        user_events = db.query(Event).filter(
            Event.created_by == user_id,
            Event.start_time >= datetime.utcnow()  # Only future events
        ).order_by(Event.start_time).all()
        
        # Try to find slots starting from the original requested time
        current_time = start_time
        
        for _ in range(num_suggestions * 3):  # Try more times to find enough slots
            potential_end = current_time + duration
            
            # Check if this slot conflicts with any existing event
            conflicts = check_event_conflicts(db, user_id, current_time, potential_end, buffer_minutes=15)
            
            if not conflicts:
                suggestions.append(TimeSlot(
                    start_time=current_time,
                    end_time=potential_end,
                    date=current_time.strftime("%Y-%m-%d"),
                    time_range=f"{current_time.strftime('%I:%M %p')} - {potential_end.strftime('%I:%M %p')}"
                ))
                
                if len(suggestions) >= num_suggestions:
                    break
            
            # Move to next potential slot (30 minutes later)
            current_time += timedelta(minutes=30)
            
            # Don't suggest slots too far in the future (within 2 weeks)
            if current_time > start_time + timedelta(days=14):
                break
        
        return suggestions
    except Exception as e:
        logger.error(f"Error suggesting alternative time slots: {e}")
        return []

def parse_natural_language_event_sync(text: str) -> dict:
    """Parse natural language text into event data using OpenAI"""
    try:
        if not OPENAI_API_KEY:
            logger.warning("OpenAI API key not available, using fallback parser")
            return parse_event_fallback(text)
        
        # OpenAI prompt for event parsing
        system_prompt = """You are a helpful assistant that extracts event information from natural language text. 
        Extract the following information and return it as a JSON object:
        - title: The main event title
        - description: Additional details about the event
        - start_time: Start date and time in ISO format (YYYY-MM-DDTHH:MM:SS)
        - end_time: End date and time in ISO format (YYYY-MM-DDTHH:MM:SS)
        - venue: Location of the event
        - priority: "low", "medium", or "high" based on urgency/importance
        
        If any information is missing or unclear, set it to null.
        If no specific end time is mentioned, assume 1 hour duration.
        If no specific date is mentioned, assume today.
        If no specific time is mentioned, assume a reasonable time during business hours.
        
        Return only valid JSON, no additional text."""
        
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract event information from: '{text}'"}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        # Parse the response
        content = response.choices[0].message.content.strip()
        
        # Clean up the response to ensure it's valid JSON
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        
        parsed_data = json.loads(content)
        
        # Validate and process the parsed data
        processed_data = {
            "title": parsed_data.get("title"),
            "description": parsed_data.get("description"),
            "start_time": None,
            "end_time": None,
            "venue": parsed_data.get("venue"),
            "priority": parsed_data.get("priority", "medium"),
            "confidence": 0.8,  # High confidence for OpenAI parsing
            "raw_text": text
        }
        
        # Process datetime strings
        if parsed_data.get("start_time"):
            try:
                processed_data["start_time"] = datetime.fromisoformat(parsed_data["start_time"].replace("Z", "+00:00"))
            except:
                processed_data["start_time"] = None
        
        if parsed_data.get("end_time"):
            try:
                processed_data["end_time"] = datetime.fromisoformat(parsed_data["end_time"].replace("Z", "+00:00"))
            except:
                processed_data["end_time"] = None
        
        # If start_time is parsed but end_time is not, add 1 hour
        if processed_data["start_time"] and not processed_data["end_time"]:
            processed_data["end_time"] = processed_data["start_time"] + timedelta(hours=1)
        
        logger.info(f"Successfully parsed event using OpenAI: {processed_data['title']}")
        return processed_data
        
    except Exception as e:
        logger.error(f"Error parsing with OpenAI: {e}")
        return parse_event_fallback(text)

def parse_event_fallback(text: str) -> dict:
    """Fallback parser using regex patterns"""
    try:
        result = {
            "title": None,
            "description": None,
            "start_time": None,
            "end_time": None,
            "venue": None,
            "priority": "medium",
            "confidence": 0.5,  # Lower confidence for regex parsing
            "raw_text": text
        }
        
        # Simple regex patterns for common event patterns
        # Title extraction - take first part before time/date mentions
        title_match = re.search(r'^([^0-9]+?)(?:\s+(?:on|at|from|tomorrow|today|next|this))', text, re.IGNORECASE)
        if title_match:
            result["title"] = title_match.group(1).strip()
        else:
            # Fallback - use first few words
            words = text.split()[:4]
            result["title"] = " ".join(words)
        
        # Time extraction - look for time patterns
        time_patterns = [
            r'(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)',
            r'(\d{1,2})\s*(AM|PM|am|pm)',
            r'at\s+(\d{1,2}):(\d{2})',
            r'at\s+(\d{1,2})\s*(AM|PM|am|pm)'
        ]
        
        # Date extraction - look for date patterns
        date_patterns = [
            r'tomorrow',
            r'today',
            r'next\s+(\w+)',
            r'this\s+(\w+)',
            r'(\d{1,2})/(\d{1,2})',
            r'(\w+)\s+(\d{1,2})'
        ]
        
        # Set default time if not found
        now = datetime.now()
        start_time = now.replace(hour=9, minute=0, second=0, microsecond=0)  # Default 9 AM
        
        # Simple date adjustment
        if "tomorrow" in text.lower():
            start_time += timedelta(days=1)
        elif "next week" in text.lower():
            start_time += timedelta(days=7)
        
        result["start_time"] = start_time
        result["end_time"] = start_time + timedelta(hours=1)
        
        # Venue extraction - look for "at" or "in" patterns
        venue_match = re.search(r'(?:at|in)\s+([^0-9]+?)(?:\s+(?:on|at|from|tomorrow|today|next|this)|$)', text, re.IGNORECASE)
        if venue_match:
            result["venue"] = venue_match.group(1).strip()
        
        # Priority detection
        if any(word in text.lower() for word in ['urgent', 'important', 'asap', 'critical']):
            result["priority"] = "high"
        elif any(word in text.lower() for word in ['low', 'casual', 'optional']):
            result["priority"] = "low"
        
        logger.info(f"Used fallback parser for event: {result['title']}")
        return result
        
    except Exception as e:
        logger.error(f"Error in fallback parser: {e}")
        return {
            "title": text[:50],  # Use first 50 chars as title
            "description": text,
            "start_time": datetime.now().replace(hour=9, minute=0, second=0, microsecond=0),
            "end_time": datetime.now().replace(hour=10, minute=0, second=0, microsecond=0),
            "venue": None,
            "priority": "medium",
            "confidence": 0.2,
            "raw_text": text
        }

# API Routes
@app.get("/api/")
async def root():
    """Health check endpoint"""
    return {"message": "Hello from the Itinerary Management System API", "version": "1.0.0", "status": "healthy"}

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """Detailed health check"""
    try:
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "healthy" else "unhealthy",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# Authentication endpoints
@app.post("/api/users", response_model=UserResponse)
async def create_user(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == user.username) | (User.email == user.email)
        ).first()
        
        if existing_user:
            if existing_user.username == user.username:
                raise HTTPException(status_code=400, detail="Username already registered")
            else:
                raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        user_id = str(uuid.uuid4())
        db_user = User(
            id=user_id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            hashed_password=get_password_hash(user.password),
            role=user.role,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create welcome notification
        background_tasks.add_task(
            create_notification,
            db,
            user_id,
            "Welcome to Itinerary Management System!",
            "Welcome! You can now start creating and managing your events.",
            "event_created"
        )
        
        logger.info(f"User created: {user.username}")
        return UserResponse(
            id=db_user.id,
            email=db_user.email,
            username=db_user.username,
            full_name=db_user.full_name,
            role=db_user.role,
            created_at=db_user.created_at,
            is_active=db_user.is_active
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login endpoint"""
    try:
        user = db.query(User).filter(User.username == form_data.username).first()
        
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled",
            )
        
        access_token_expires = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        logger.info(f"User logged in: {form_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        created_at=current_user.created_at,
        is_active=current_user.is_active
    )

# Event endpoints
@app.get("/api/events", response_model=List[EventResponse])
async def get_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get events for the current user"""
    try:
        query = db.query(Event).filter(Event.created_by == current_user.id)
        
        if start_date:
            query = query.filter(Event.start_time >= start_date)
        if end_date:
            query = query.filter(Event.start_time <= end_date)
        
        events = query.order_by(Event.start_time).all()
        
        return [
            EventResponse(
                id=event.id,
                title=event.title,
                description=event.description,
                start_time=event.start_time,
                end_time=event.end_time,
                venue=event.venue,
                priority=event.priority,
                recurrence=event.recurrence,
                recurrence_end_date=event.recurrence_end_date,
                created_by=event.created_by,
                created_at=event.created_at,
                updated_at=event.updated_at
            )
            for event in events
        ]
        
    except Exception as e:
        logger.error(f"Error retrieving events: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve events")

@app.post("/api/events", response_model=EventResponse)
async def create_event(
    event: EventCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new event with conflict detection"""
    try:
        # Validate event times
        if event.start_time >= event.end_time:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        
        # Check for conflicts
        conflicts = check_event_conflicts(db, current_user.id, event.start_time, event.end_time)
        
        if conflicts:
            # Get alternative time slots
            suggestions = suggest_alternative_time_slots(db, current_user.id, event.start_time, event.end_time)
            
            conflict_details = {
                "message": f"Event conflicts with {len(conflicts)} existing event(s)",
                "conflicts": [
                    {
                        "title": conflict.title,
                        "start_time": conflict.start_time.isoformat(),
                        "end_time": conflict.end_time.isoformat(),
                        "priority": conflict.priority
                    }
                    for conflict in conflicts
                ],
                "suggested_slots": [
                    {
                        "start_time": slot.start_time.isoformat(),
                        "end_time": slot.end_time.isoformat(),
                        "date": slot.date,
                        "time_range": slot.time_range
                    }
                    for slot in suggestions
                ]
            }
            
            raise HTTPException(
                status_code=409,  # Conflict status code
                detail=conflict_details
            )
        
        event_id = str(uuid.uuid4())
        db_event = Event(
            id=event_id,
            title=event.title,
            description=event.description,
            start_time=event.start_time,
            end_time=event.end_time,
            venue=event.venue,
            priority=event.priority,
            recurrence=event.recurrence,
            recurrence_end_date=event.recurrence_end_date,
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        
        # Create notification
        background_tasks.add_task(
            create_notification,
            db,
            current_user.id,
            "Event Created",
            f"Your event '{event.title}' has been created successfully.",
            "event_created",
            event_id
        )
        
        logger.info(f"Event created by {current_user.username}: {event.title}")
        return EventResponse(
            id=db_event.id,
            title=db_event.title,
            description=db_event.description,
            start_time=db_event.start_time,
            end_time=db_event.end_time,
            venue=db_event.venue,
            priority=db_event.priority,
            recurrence=db_event.recurrence,
            recurrence_end_date=db_event.recurrence_end_date,
            created_by=db_event.created_by,
            created_at=db_event.created_at,
            updated_at=db_event.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating event: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create event")

@app.get("/api/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a specific event"""
    try:
        event = db.query(Event).filter(
            Event.id == event_id,
            Event.created_by == current_user.id
        ).first()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return EventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            start_time=event.start_time,
            end_time=event.end_time,
            venue=event.venue,
            priority=event.priority,
            recurrence=event.recurrence,
            recurrence_end_date=event.recurrence_end_date,
            created_by=event.created_by,
            created_at=event.created_at,
            updated_at=event.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving event: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve event")

@app.put("/api/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_update: EventCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an event"""
    try:
        # Check if event exists and belongs to user
        db_event = db.query(Event).filter(
            Event.id == event_id,
            Event.created_by == current_user.id
        ).first()
        
        if not db_event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Validate times
        if event_update.start_time >= event_update.end_time:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        
        # Update event
        db_event.title = event_update.title
        db_event.description = event_update.description
        db_event.start_time = event_update.start_time
        db_event.end_time = event_update.end_time
        db_event.venue = event_update.venue
        db_event.priority = event_update.priority
        db_event.recurrence = event_update.recurrence
        db_event.recurrence_end_date = event_update.recurrence_end_date
        db_event.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_event)
        
        # Create notification
        background_tasks.add_task(
            create_notification,
            db,
            current_user.id,
            "Event Updated",
            f"Your event '{db_event.title}' has been updated.",
            "event_updated",
            event_id
        )
        
        logger.info(f"Event updated by {current_user.username}: {event_id}")
        return EventResponse(
            id=db_event.id,
            title=db_event.title,
            description=db_event.description,
            start_time=db_event.start_time,
            end_time=db_event.end_time,
            venue=db_event.venue,
            priority=db_event.priority,
            recurrence=db_event.recurrence,
            recurrence_end_date=db_event.recurrence_end_date,
            created_by=db_event.created_by,
            created_at=db_event.created_at,
            updated_at=db_event.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating event: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update event")

@app.delete("/api/events/{event_id}")
async def delete_event(
    event_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an event"""
    try:
        # Check if event exists and belongs to user
        event = db.query(Event).filter(
            Event.id == event_id,
            Event.created_by == current_user.id
        ).first()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_title = event.title
        db.delete(event)
        db.commit()
        
        # Create notification
        background_tasks.add_task(
            create_notification,
            db,
            current_user.id,
            "Event Deleted",
            f"Your event '{event_title}' has been deleted.",
            "event_deleted"
        )
        
        logger.info(f"Event deleted by {current_user.username}: {event_id}")
        return {"message": "Event deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting event: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete event")

# Notification endpoints
@app.get("/api/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get notifications for the current user"""
    try:
        notifications = db.query(Notification).filter(
            Notification.user_id == current_user.id
        ).order_by(Notification.created_at.desc()).limit(50).all()
        
        return [
            NotificationResponse(
                id=notification.id,
                user_id=notification.user_id,
                title=notification.title,
                message=notification.message,
                type=notification.type,
                reference_id=notification.reference_id,
                status=notification.status,
                created_at=notification.created_at,
                read_at=notification.read_at
            )
            for notification in notifications
        ]
        
    except Exception as e:
        logger.error(f"Error retrieving notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notifications")

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    try:
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        ).first()
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        notification.status = "read"
        notification.read_at = datetime.utcnow()
        db.commit()
        
        return {"message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")

# New API endpoints for advanced features
@app.post("/api/parse-event", response_model=ParsedEventResponse)
async def parse_natural_language_event(
    request: NaturalLanguageEventRequest,
    current_user: User = Depends(get_current_user)
):
    """Parse natural language text into event data"""
    try:
        logger.info(f"Parsing natural language event for user {current_user.username}: {request.text}")
        
        # Parse the text using OpenAI or fallback (this is now a regular function, not async)
        parsed_data = parse_natural_language_event(request.text)
        
        return ParsedEventResponse(
            title=parsed_data.get("title"),
            description=parsed_data.get("description"),
            start_time=parsed_data.get("start_time"),
            end_time=parsed_data.get("end_time"),
            venue=parsed_data.get("venue"),
            priority=parsed_data.get("priority", "medium"),
            confidence=parsed_data.get("confidence", 0.5),
            raw_text=parsed_data.get("raw_text", request.text)
        )
        
    except Exception as e:
        logger.error(f"Error parsing natural language event: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse event text")

@app.post("/api/check-conflicts", response_model=ConflictCheckResponse)
async def check_event_conflicts_endpoint(
    request: ConflictCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check for event conflicts and suggest alternative times"""
    try:
        # Validate times
        if request.start_time >= request.end_time:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        
        # Check for conflicts
        conflicts = check_event_conflicts(
            db, 
            current_user.id, 
            request.start_time, 
            request.end_time, 
            exclude_event_id=request.event_id,
            buffer_minutes=15
        )
        
        has_conflict = len(conflicts) > 0
        suggested_slots = []
        
        if has_conflict:
            # Get alternative time slots
            suggested_slots = suggest_alternative_time_slots(
                db, 
                current_user.id, 
                request.start_time, 
                request.end_time,
                num_suggestions=5
            )
        
        return ConflictCheckResponse(
            has_conflict=has_conflict,
            conflicts=conflicts,
            suggested_slots=suggested_slots,
            buffer_time_minutes=15
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking conflicts: {e}")
        raise HTTPException(status_code=500, detail="Failed to check event conflicts")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )

print(sys.path)
