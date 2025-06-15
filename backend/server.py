from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
from dotenv import load_dotenv
import asyncio
import logging
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "itinerary_management")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 30  # 30 days

# Database connection
client = None
database = None

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global client, database
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        database = client[DB_NAME]
        
        # Test the connection
        await client.admin.command('ismaster')
        logger.info(f"Connected to MongoDB at {MONGO_URL}")
        logger.info(f"Using database: {DB_NAME}")
        
        # Create indexes for better performance
        await create_indexes()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise
    
    yield
    
    # Shutdown
    if client:
        client.close()
        logger.info("MongoDB connection closed")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Itinerary Management System API",
    description="A comprehensive event scheduling and management system",
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

class User(UserBase):
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
    priority: str = Field(default="medium", regex="^(low|medium|high)$")
    recurrence: str = Field(default="none", regex="^(none|daily|weekly|monthly)$")
    recurrence_end_date: Optional[datetime] = None
    participants: List[str] = Field(default_factory=list)

class EventCreate(EventBase):
    pass

class EventUpdate(EventBase):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class Event(EventBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

class NotificationBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=500)
    type: str = Field(..., regex="^(event_created|event_updated|event_deleted|event_reminder)$")
    reference_id: Optional[str] = None

class Notification(NotificationBase):
    id: str
    user_id: str
    status: str = Field(default="unread", regex="^(read|unread)$")
    created_at: datetime
    read_at: Optional[datetime] = None

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

async def create_indexes():
    """Create database indexes for better performance"""
    try:
        # User indexes
        await database.users.create_index("username", unique=True)
        await database.users.create_index("email", unique=True)
        
        # Event indexes
        await database.events.create_index("created_by")
        await database.events.create_index("start_time")
        await database.events.create_index([("created_by", 1), ("start_time", 1)])
        
        # Notification indexes
        await database.notifications.create_index("user_id")
        await database.notifications.create_index([("user_id", 1), ("status", 1)])
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Failed to create some indexes: {e}")

async def get_current_user(token: str = Depends(oauth2_scheme)):
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
    
    user = await database.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    
    return User(**user, id=user["_id"])

# Background tasks
async def create_notification(user_id: str, title: str, message: str, notification_type: str, reference_id: str = None):
    """Create a notification for a user"""
    try:
        notification_data = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "reference_id": reference_id,
            "status": "unread",
            "created_at": datetime.utcnow(),
            "read_at": None
        }
        
        await database.notifications.insert_one(notification_data)
        logger.info(f"Notification created for user {user_id}: {title}")
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")

# API Routes

@app.get("/api/")
async def root():
    """Health check endpoint"""
    return {"message": "Hello from the Itinerary Management System API", "version": "1.0.0", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    try:
        # Check database connection
        await client.admin.command('ismaster')
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
@app.post("/api/users", response_model=User)
async def create_user(user: UserCreate, background_tasks: BackgroundTasks):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await database.users.find_one({
            "$or": [
                {"username": user.username},
                {"email": user.email}
            ]
        })
        
        if existing_user:
            if existing_user["username"] == user.username:
                raise HTTPException(status_code=400, detail="Username already registered")
            else:
                raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        user_data = {
            "_id": str(uuid.uuid4()),
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "hashed_password": get_password_hash(user.password),
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        await database.users.insert_one(user_data)
        
        # Create welcome notification
        background_tasks.add_task(
            create_notification,
            user_data["_id"],
            "Welcome to Itinerary Management System!",
            "Welcome! You can now start creating and managing your events.",
            "event_created"
        )
        
        logger.info(f"User created: {user.username}")
        return User(**user_data, id=user_data["_id"])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint"""
    try:
        user = await database.users.find_one({"username": form_data.username})
        
        if not user or not verify_password(form_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled",
            )
        
        access_token_expires = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        access_token = create_access_token(
            data={"sub": user["username"]}, expires_delta=access_token_expires
        )
        
        logger.info(f"User logged in: {form_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Event endpoints
@app.get("/api/events", response_model=List[Event])
async def get_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
):
    """Get events for the current user"""
    try:
        query = {"created_by": current_user.id}
        
        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = start_date
            if end_date:
                date_query["$lte"] = end_date
            query["start_time"] = date_query
        
        cursor = database.events.find(query).sort("start_time", 1)
        events = []
        
        async for event in cursor:
            events.append(Event(**event, id=event["_id"]))
        
        logger.info(f"Retrieved {len(events)} events for user {current_user.username}")
        return events
        
    except Exception as e:
        logger.error(f"Error retrieving events: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve events")

@app.post("/api/events", response_model=Event)
async def create_event(
    event: EventCreate, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Create a new event"""
    try:
        # Validate event times
        if event.start_time >= event.end_time:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        
        # Check for conflicts
        conflict = await database.events.find_one({
            "created_by": current_user.id,
            "$or": [
                {
                    "start_time": {"$lt": event.end_time},
                    "end_time": {"$gt": event.start_time}
                }
            ]
        })
        
        if conflict:
            logger.warning(f"Event conflict detected for user {current_user.username}")
        
        event_data = {
            "_id": str(uuid.uuid4()),
            **event.dict(),
            "created_by": current_user.id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await database.events.insert_one(event_data)
        
        # Create notification
        background_tasks.add_task(
            create_notification,
            current_user.id,
            "Event Created",
            f"Your event '{event.title}' has been created successfully.",
            "event_created",
            event_data["_id"]
        )
        
        logger.info(f"Event created by {current_user.username}: {event.title}")
        return Event(**event_data, id=event_data["_id"])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating event: {e}")
        raise HTTPException(status_code=500, detail="Failed to create event")

@app.get("/api/events/{event_id}", response_model=Event)
async def get_event(event_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific event"""
    try:
        event = await database.events.find_one({
            "_id": event_id,
            "created_by": current_user.id
        })
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return Event(**event, id=event["_id"])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving event: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve event")

@app.put("/api/events/{event_id}", response_model=Event)
async def update_event(
    event_id: str,
    event_update: EventUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Update an event"""
    try:
        # Check if event exists and belongs to user
        existing_event = await database.events.find_one({
            "_id": event_id,
            "created_by": current_user.id
        })
        
        if not existing_event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Validate times if provided
        update_data = {k: v for k, v in event_update.dict().items() if v is not None}
        
        if "start_time" in update_data or "end_time" in update_data:
            start_time = update_data.get("start_time", existing_event["start_time"])
            end_time = update_data.get("end_time", existing_event["end_time"])
            
            if start_time >= end_time:
                raise HTTPException(status_code=400, detail="End time must be after start time")
        
        update_data["updated_at"] = datetime.utcnow()
        
        await database.events.update_one(
            {"_id": event_id},
            {"$set": update_data}
        )
        
        # Get updated event
        updated_event = await database.events.find_one({"_id": event_id})
        
        # Create notification
        background_tasks.add_task(
            create_notification,
            current_user.id,
            "Event Updated",
            f"Your event '{updated_event['title']}' has been updated.",
            "event_updated",
            event_id
        )
        
        logger.info(f"Event updated by {current_user.username}: {event_id}")
        return Event(**updated_event, id=updated_event["_id"])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating event: {e}")
        raise HTTPException(status_code=500, detail="Failed to update event")

@app.delete("/api/events/{event_id}")
async def delete_event(
    event_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Delete an event"""
    try:
        # Check if event exists and belongs to user
        event = await database.events.find_one({
            "_id": event_id,
            "created_by": current_user.id
        })
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        await database.events.delete_one({"_id": event_id})
        
        # Create notification
        background_tasks.add_task(
            create_notification,
            current_user.id,
            "Event Deleted",
            f"Your event '{event['title']}' has been deleted.",
            "event_deleted"
        )
        
        logger.info(f"Event deleted by {current_user.username}: {event_id}")
        return {"message": "Event deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting event: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete event")

# Notification endpoints
@app.get("/api/notifications", response_model=List[Notification])
async def get_notifications(current_user: User = Depends(get_current_user)):
    """Get notifications for the current user"""
    try:
        cursor = database.notifications.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).limit(50)  # Limit to 50 most recent
        
        notifications = []
        async for notification in cursor:
            notifications.append(Notification(**notification, id=notification["_id"]))
        
        return notifications
        
    except Exception as e:
        logger.error(f"Error retrieving notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notifications")

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read"""
    try:
        result = await database.notifications.update_one(
            {
                "_id": notification_id,
                "user_id": current_user.id
            },
            {
                "$set": {
                    "status": "read",
                    "read_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")

# Debug endpoints (for development)
if os.getenv("DEBUG", "false").lower() == "true":
    @app.get("/api/debug/users")
    async def debug_get_users():
        """Debug endpoint to list all users"""
        cursor = database.users.find({})
        users = []
        async for user in cursor:
            users.append({
                "id": user["_id"],
                "username": user["username"],
                "email": user["email"],
                "role": user["role"]
            })
        return users
    
    @app.get("/api/debug/events")
    async def debug_get_events():
        """Debug endpoint to list all events"""
        cursor = database.events.find({})
        events = []
        async for event in cursor:
            events.append({
                "id": event["_id"],
                "title": event["title"],
                "created_by": event["created_by"]
            })
        return events

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )