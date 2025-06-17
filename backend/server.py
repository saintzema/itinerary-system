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

# Import database components
from database import get_db, create_tables, User, Event, Notification

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 30  # 30 days

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
    """Create a new event"""
    try:
        # Validate event times
        if event.start_time >= event.end_time:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        
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
