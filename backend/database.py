from sqlalchemy import create_engine, Column, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL - SQLite for local, PostgreSQL for production
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Local development - SQLite (no setup required)
    DATABASE_URL = "sqlite:///./itinerary.db"
    print("Using SQLite database for local development")
else:
    # Production - PostgreSQL (provided by Render)
    print("Using PostgreSQL database for production")
    # Fix for Render PostgreSQL URL
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    try:
        # Try to create PostgreSQL engine
        engine = create_engine(DATABASE_URL)
    except Exception as e:
        print(f"PostgreSQL connection failed: {e}")
        print("Falling back to SQLite...")
        DATABASE_URL = "sqlite:///./itinerary.db"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Event(Base):
    __tablename__ = "events"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    venue = Column(String)
    priority = Column(String, default="medium")
    recurrence = Column(String, default="none")
    recurrence_end_date = Column(DateTime)
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, nullable=False)
    reference_id = Column(String)
    status = Column(String, default="unread")
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime)

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()