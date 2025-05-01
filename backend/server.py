from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
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
