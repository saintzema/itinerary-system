from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from enum import Enum
import jwt
from passlib.context import CryptContext
from fastapi.encoders import jsonable_encoder
import asyncio
from threading import Thread
import time

# Constants
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
SECRET_KEY = "temporarysecretkey"  # In production, use a proper secret key from environment variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"
    USER = "user"

class PriorityLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class RecurrenceType(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    hashed_password: str
    full_name: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: str
    role: UserRole = UserRole.USER

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: str
    full_name: str
    role: UserRole
    created_at: datetime

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    venue: Optional[str] = None
    priority: PriorityLevel = PriorityLevel.MEDIUM
    recurrence: RecurrenceType = RecurrenceType.NONE
    recurrence_end_date: Optional[datetime] = None
    created_by: str  # User ID
    participants: List[str] = []  # List of User IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    venue: Optional[str] = None
    priority: PriorityLevel = PriorityLevel.MEDIUM
    recurrence: RecurrenceType = RecurrenceType.NONE
    recurrence_end_date: Optional[datetime] = None
    participants: List[str] = []
    
    # Add validator for recurrence_end_date
    @model_validator(mode='before')
    @classmethod
    def validate_empty_string_dates(cls, data):
        if isinstance(data, dict):
            # Handle empty string for recurrence_end_date
            if 'recurrence_end_date' in data and data['recurrence_end_date'] == "":
                data['recurrence_end_date'] = None
                
            # If recurrence is 'none', ensure recurrence_end_date is None
            if 'recurrence' in data and data['recurrence'] == 'none':
                data['recurrence_end_date'] = None
        return data

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    venue: Optional[str] = None
    priority: Optional[PriorityLevel] = None
    recurrence: Optional[RecurrenceType] = None
    recurrence_end_date: Optional[datetime] = None
    participants: Optional[List[str]] = None

class EventResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    venue: Optional[str]
    priority: PriorityLevel
    recurrence: RecurrenceType
    recurrence_end_date: Optional[datetime]
    created_by: str
    participants: List[str]
    created_at: datetime
    updated_at: datetime

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    READ = "read"

class NotificationType(str, Enum):
    EVENT_REMINDER = "event_reminder"
    EVENT_UPDATE = "event_update"
    EVENT_CANCELLATION = "event_cancellation"
    SYSTEM = "system"

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: NotificationType
    status: NotificationStatus = NotificationStatus.PENDING
    reference_id: Optional[str] = None  # Reference to an event
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scheduled_for: Optional[datetime] = None  # When the notification should be sent
    read_at: Optional[datetime] = None

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: NotificationType
    reference_id: Optional[str] = None
    scheduled_for: Optional[datetime] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: NotificationType
    status: NotificationStatus
    reference_id: Optional[str]
    created_at: datetime
    scheduled_for: Optional[datetime]
    read_at: Optional[datetime]

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user_by_username(username: str):
    user = await db.users.find_one({"username": username})
    if user:
        return user
    return None

async def authenticate_user(username: str, password: str):
    user = await get_user_by_username(username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user

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
        token_data = TokenData(username=username)
    except:
        raise credentials_exception
    user = await get_user_by_username(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    return current_user

# Routes for authentication
@api_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User Routes
@api_router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate):
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    del user_dict["password"]
    
    new_user = User(
        **user_dict,
        hashed_password=hashed_password
    )
    
    result = await db.users.insert_one(jsonable_encoder(new_user))
    created_user = await db.users.find_one({"_id": result.inserted_id})
    
    return UserResponse(
        id=str(created_user["id"]),
        email=created_user["email"],
        username=created_user["username"],
        full_name=created_user["full_name"],
        role=created_user["role"],
        created_at=created_user["created_at"]
    )

@api_router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_active_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user["username"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        created_at=current_user["created_at"]
    )

@api_router.get("/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_active_user)):
    # Only admin and staff can view all users
    if current_user["role"] not in [UserRole.ADMIN, UserRole.STAFF]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view all users"
        )
    
    users = await db.users.find().to_list(1000)
    return [
        UserResponse(
            id=user["id"],
            email=user["email"],
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
            created_at=user["created_at"]
        ) for user in users
    ]

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    # Only admin can update users
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update users"
        )
    
    # Get existing user
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create update dictionary with non-None fields
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update the user
    await db.users.update_one(
        {"id": user_id},
        {"$set": jsonable_encoder(update_data)}
    )
    
    # Return updated user
    updated_user = await db.users.find_one({"id": user_id})
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        username=updated_user["username"],
        full_name=updated_user["full_name"],
        role=updated_user["role"],
        created_at=updated_user["created_at"]
    )

# Event Routes
@api_router.post("/events", response_model=EventResponse)
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_active_user)):
    new_event = Event(
        **event.dict(),
        created_by=current_user["id"]
    )
    
    # Check for conflicts (overlapping events for participants)
    for participant_id in new_event.participants:
        conflicts = await db.events.find({
            "participants": participant_id,
            "$or": [
                {
                    "start_time": {"$lt": new_event.end_time},
                    "end_time": {"$gt": new_event.start_time}
                }
            ]
        }).to_list(100)
        
        if conflicts:
            raise HTTPException(
                status_code=400,
                detail=f"Event conflicts with existing events for one or more participants"
            )
    
    result = await db.events.insert_one(jsonable_encoder(new_event))
    created_event = await db.events.find_one({"_id": result.inserted_id})
    
    return EventResponse(**created_event)

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(
    current_user: dict = Depends(get_current_active_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    
    # If date range is provided, filter by date
    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = {
                "$or": [
                    {
                        "start_time": {
                            "$gte": start,
                            "$lte": end
                        }
                    },
                    {
                        "end_time": {
                            "$gte": start,
                            "$lte": end
                        }
                    }
                ]
            }
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
            )
    
    # Add user filtering - show events where user is creator or participant
    user_filter = {
        "$or": [
            {"created_by": current_user["id"]},
            {"participants": current_user["id"]}
        ]
    }
    
    # Combine filters
    if query:
        query = {"$and": [query, user_filter]}
    else:
        query = user_filter
    
    events = await db.events.find(query).to_list(1000)
    return [EventResponse(**event) for event in events]

@api_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, current_user: dict = Depends(get_current_active_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user has permission to view the event
    if event["created_by"] != current_user["id"] and current_user["id"] not in event["participants"]:
        if current_user["role"] != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized to view this event")
    
    return EventResponse(**event)

@api_router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str, 
    event_update: EventUpdate, 
    current_user: dict = Depends(get_current_active_user)
):
    # Get existing event
    existing_event = await db.events.find_one({"id": event_id})
    if not existing_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check permissions - only admin, creator or staff can update
    if (
        existing_event["created_by"] != current_user["id"] 
        and current_user["role"] != UserRole.ADMIN
        and current_user["role"] != UserRole.STAFF
    ):
        raise HTTPException(status_code=403, detail="Not authorized to update this event")
    
    # Create update dictionary with non-None fields
    update_data = {k: v for k, v in event_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update the event
    await db.events.update_one(
        {"id": event_id},
        {"$set": jsonable_encoder(update_data)}
    )
    
    # Return updated event
    updated_event = await db.events.find_one({"id": event_id})
    return EventResponse(**updated_event)

@api_router.delete("/events/{event_id}")
async def delete_event(
    event_id: str, 
    current_user: dict = Depends(get_current_active_user)
):
    # Get existing event
    existing_event = await db.events.find_one({"id": event_id})
    if not existing_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check permissions - only admin or creator can delete
    if (
        existing_event["created_by"] != current_user["id"] 
        and current_user["role"] != UserRole.ADMIN
    ):
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")
    
    # Delete the event
    await db.events.delete_one({"id": event_id})
    
    return {"message": "Event deleted successfully"}

# Notification background task
async def process_notifications():
    """Background task to process notifications that are due to be sent"""
    logger.info("Starting notification processing service")
    
    while True:
        try:
            # Find notifications that are scheduled and due
            now = datetime.utcnow()
            pending_notifications = await db.notifications.find({
                "status": NotificationStatus.PENDING,
                "$or": [
                    {"scheduled_for": None},  # Send immediately
                    {"scheduled_for": {"$lte": now}}  # Due to be sent
                ]
            }).to_list(100)
            
            for notification in pending_notifications:
                # Mark as sent
                await db.notifications.update_one(
                    {"id": notification["id"]},
                    {"$set": {"status": NotificationStatus.SENT}}
                )
                
                logger.info(f"Notification sent: {notification['title']} to user {notification['user_id']}")
                
                # In a real system, this would send an email, push notification, etc.
                # For now, we just log it
            
            # Sleep before next check
            await asyncio.sleep(60)  # Check every minute
            
        except Exception as e:
            logger.error(f"Error in notification service: {str(e)}")
            await asyncio.sleep(60)  # Retry after a minute

# Start the notification background task
@app.on_event("startup")
async def start_notification_service():
    asyncio.create_task(process_notifications())

# Add endpoints for notifications
@api_router.post("/notifications", response_model=NotificationResponse)
async def create_notification(
    notification: NotificationCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user)
):
    # Check if user has permission (admin or creating notification for themselves)
    if current_user["role"] != UserRole.ADMIN and notification.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to create notifications for other users")
    
    new_notification = Notification(**notification.dict())
    
    result = await db.notifications.insert_one(jsonable_encoder(new_notification))
    created_notification = await db.notifications.find_one({"_id": result.inserted_id})
    
    return NotificationResponse(**created_notification)

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_active_user)):
    # Get notifications for the current user
    notifications = await db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    return [NotificationResponse(**notification) for notification in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    # Find notification
    notification = await db.notifications.find_one({"id": notification_id})
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Check if user has permission to mark it as read
    if notification["user_id"] != current_user["id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this notification")
    
    # Update notification
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {
            "status": NotificationStatus.READ,
            "read_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Notification marked as read"}

# Helper function to create event notifications
async def create_event_notifications(event, event_type=NotificationType.EVENT_REMINDER):
    """Create notifications for all participants of an event"""
    
    # Get all participants
    participant_ids = event.participants
    
    # Add event creator as well
    if event.created_by not in participant_ids:
        participant_ids.append(event.created_by)
    
    # Create appropriate message based on event type
    if event_type == NotificationType.EVENT_REMINDER:
        title = f"Reminder: {event.title}"
        message = f"You have an upcoming event: {event.title} on {event.start_time.strftime('%Y-%m-%d at %H:%M')}"
    elif event_type == NotificationType.EVENT_UPDATE:
        title = f"Event Updated: {event.title}"
        message = f"An event you are part of has been updated: {event.title} on {event.start_time.strftime('%Y-%m-%d at %H:%M')}"
    elif event_type == NotificationType.EVENT_CANCELLATION:
        title = f"Event Cancelled: {event.title}"
        message = f"An event you are part of has been cancelled: {event.title} that was scheduled for {event.start_time.strftime('%Y-%m-%d at %H:%M')}"
    
    # Create notifications for each participant
    for user_id in participant_ids:
        # For event reminders, schedule it for 24 hours before the event
        scheduled_for = None
        if event_type == NotificationType.EVENT_REMINDER:
            scheduled_for = event.start_time - timedelta(hours=24)
            # If the event is less than 24 hours away, send immediately
            if scheduled_for < datetime.utcnow():
                scheduled_for = None
        
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=event_type,
            reference_id=event.id,
            scheduled_for=scheduled_for
        )
        
        await db.notifications.insert_one(jsonable_encoder(notification))

# Update event creation to include notifications
@api_router.post("/events", response_model=EventResponse)
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_active_user)):
    new_event = Event(
        **event.dict(),
        created_by=current_user["id"]
    )
    
    # Check for conflicts (overlapping events for participants)
    for participant_id in new_event.participants:
        conflicts = await db.events.find({
            "participants": participant_id,
            "$or": [
                {
                    "start_time": {"$lt": new_event.end_time},
                    "end_time": {"$gt": new_event.start_time}
                }
            ]
        }).to_list(100)
        
        if conflicts:
            raise HTTPException(
                status_code=400,
                detail=f"Event conflicts with existing events for one or more participants"
            )
    
    result = await db.events.insert_one(jsonable_encoder(new_event))
    created_event = await db.events.find_one({"_id": result.inserted_id})
    
    # Create notifications for participants
    await create_event_notifications(new_event, NotificationType.EVENT_REMINDER)
    
    return EventResponse(**created_event)

# Update the event update endpoint to create notifications
@api_router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str, 
    event_update: EventUpdate, 
    current_user: dict = Depends(get_current_active_user)
):
    # Get existing event
    existing_event = await db.events.find_one({"id": event_id})
    if not existing_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check permissions - only admin, creator or staff can update
    if (
        existing_event["created_by"] != current_user["id"] 
        and current_user["role"] != UserRole.ADMIN
        and current_user["role"] != UserRole.STAFF
    ):
        raise HTTPException(status_code=403, detail="Not authorized to update this event")
    
    # Create update dictionary with non-None fields
    update_data = {k: v for k, v in event_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update the event
    await db.events.update_one(
        {"id": event_id},
        {"$set": jsonable_encoder(update_data)}
    )
    
    # Get updated event
    updated_event = await db.events.find_one({"id": event_id})
    event_obj = Event(**updated_event)
    
    # Create notifications for event update
    await create_event_notifications(event_obj, NotificationType.EVENT_UPDATE)
    
    return EventResponse(**updated_event)

# Update the event delete endpoint to create notifications
@api_router.delete("/events/{event_id}")
async def delete_event(
    event_id: str, 
    current_user: dict = Depends(get_current_active_user)
):
    # Get existing event
    existing_event = await db.events.find_one({"id": event_id})
    if not existing_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check permissions - only admin or creator can delete
    if (
        existing_event["created_by"] != current_user["id"] 
        and current_user["role"] != UserRole.ADMIN
    ):
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")
    
    # Create notifications for event cancellation
    event_obj = Event(**existing_event)
    await create_event_notifications(event_obj, NotificationType.EVENT_CANCELLATION)
    
    # Delete the event
    await db.events.delete_one({"id": event_id})
    
    return {"message": "Event deleted successfully"}

@api_router.get("/debug/notifications")
async def debug_notifications(current_user: dict = Depends(get_current_active_user)):
    """Debug endpoint to check notification status"""
    # Count notifications by type
    notification_stats = {}
    
    # Get all notifications
    all_notifications = await db.notifications.find().to_list(1000)
    
    # Count by type
    for notification in all_notifications:
        notification_type = notification.get("type", "unknown")
        notification_stats[notification_type] = notification_stats.get(notification_type, 0) + 1
    
    # Count by status
    status_stats = {}
    for notification in all_notifications:
        status = notification.get("status", "unknown")
        status_stats[status] = status_stats.get(status, 0) + 1
    
    # Count by user
    user_stats = {}
    for notification in all_notifications:
        user_id = notification.get("user_id", "unknown")
        user_stats[user_id] = user_stats.get(user_id, 0) + 1
    
    return {
        "total_notifications": len(all_notifications),
        "by_type": notification_stats,
        "by_status": status_stats,
        "by_user": user_stats,
        "notifications_for_current_user": sum(1 for n in all_notifications if n.get("user_id") == current_user["id"]),
        "last_5_notifications": [
            {
                "id": n["id"],
                "title": n["title"],
                "user_id": n["user_id"],
                "status": n["status"],
                "created_at": n["created_at"],
            } for n in all_notifications[:5]
        ] if all_notifications else []
    }

@api_router.get("/")
async def root():
    return {"message": "Hello from the Itinerary Management System API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
