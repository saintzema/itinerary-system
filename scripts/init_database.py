"""
Database initialization script for Ezeji Itinerary System
Creates default admin and user accounts on first run
"""

import sys
import os
import requests
import time

# Add backend path to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def wait_for_backend():
    """Wait for backend to be ready"""
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            response = requests.get('http://localhost:8001/api/')
            if response.status_code == 200:
                print("✅ Backend is ready!")
                return True
        except requests.ConnectionError:
            pass
        
        print(f"⏳ Waiting for backend... ({attempt + 1}/{max_attempts})")
        time.sleep(2)
    
    print("❌ Backend not responding after 60 seconds")
    return False

def create_default_users():
    """Create default admin and user accounts"""
    
    default_users = [
        {
            "email": "admin@admin.com",
            "username": "admin",
            "full_name": "System Administrator",
            "password": "admin123",
            "role": "admin"
        },
        {
            "email": "user@user.com", 
            "username": "user",
            "full_name": "Regular User",
            "password": "admin123",
            "role": "user"
        }
    ]
    
    for user_data in default_users:
        try:
            response = requests.post(
                'http://localhost:8001/api/users',
                json=user_data,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Created {user_data['role']} user: {user_data['username']}")
            elif response.status_code == 400 and "already registered" in response.text:
                print(f"ℹ️  User {user_data['username']} already exists")
            else:
                print(f"⚠️  Error creating user {user_data['username']}: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating user {user_data['username']}: {e}")

def main():
    """Main initialization function"""
    print("🚀 Initializing Ezeji Itinerary System Database...")
    
    if wait_for_backend():
        create_default_users()
        print("✅ Database initialization complete!")
        print("\n📝 Default Login Credentials:")
        print("   Admin: username=admin, password=admin123")
        print("   User:  username=user, password=admin123")
    else:
        print("❌ Failed to initialize database - backend not responding")
        sys.exit(1)

if __name__ == "__main__":
    main()