from sqlalchemy import create_engine, Column, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, Column, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Universal SQLite Database Configuration
# Works out-of-the-box for local development, GitHub clones, and all deployments
def get_database_url():
    """Get database URL with fallback to SQLite for maximum compatibility"""
    
    # Check for production database URL (Vercel, Render, Railway, etc.)
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        print(f"Using production database: {database_url[:20]}...")
        # Fix PostgreSQL URL format if needed
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url
    
    # Default to SQLite for all other cases (local, GitHub, simple deployments)
    sqlite_path = "sqlite:///./ezeji_itinerary.db"
    print("Using SQLite database (no setup required)")
    return sqlite_path

DATABASE_URL = get_database_url()

# Create engine with optimal SQLite settings
def create_database_engine():
    """Create database engine with proper configuration"""
    
    if DATABASE_URL.startswith("sqlite"):
        # SQLite configuration - optimized for development and production
        engine = create_engine(
            DATABASE_URL, 
            connect_args={
                "check_same_thread": False,  # Allow multiple threads
                "timeout": 20,  # 20 second timeout
            },
            pool_pre_ping=True,  # Verify connections before use
            echo=False  # Set to True for SQL debugging
        )
    else:
        # PostgreSQL configuration for production
        try:
            engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,
                pool_recycle=300,  # Recycle connections every 5 minutes
                echo=False
            )
            # Test the connection
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            print("PostgreSQL connection successful")
        except Exception as e:
            print(f"PostgreSQL connection failed: {e}")
            print("Falling back to SQLite...")
            # Fallback to SQLite if PostgreSQL fails
            fallback_url = "sqlite:///./ezeji_itinerary.db"
            engine = create_engine(
                fallback_url,
                connect_args={"check_same_thread": False, "timeout": 20},
                pool_pre_ping=True
            )
    
    return engine

# Initialize engine
engine = create_database_engine()

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