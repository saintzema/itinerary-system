#!/bin/bash

# Minimal Render Build Script - Avoids all binary compatibility issues
echo "🚀 Starting minimal Render deployment build..."

# Check Python version
echo "Current Python version:"
python --version

# Change to backend directory
cd backend || exit 1

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install minimal dependencies (no PostgreSQL drivers)
echo "📦 Installing minimal dependencies..."
pip install -r requirements-render-minimal.txt

# Verify critical imports
echo "🧪 Testing minimal imports..."
python -c "
import sys
print(f'Python version: {sys.version}')

try:
    import sqlalchemy
    print(f'✅ SQLAlchemy {sqlalchemy.__version__}')
except ImportError as e:
    print(f'❌ SQLAlchemy import failed: {e}')
    exit(1)

try:
    import fastapi
    print(f'✅ FastAPI {fastapi.__version__}')
except ImportError as e:
    print(f'❌ FastAPI import failed: {e}')
    exit(1)

try:
    from database import Base, User, Event, Notification
    print('✅ Database models imported successfully')
except ImportError as e:
    print(f'❌ Database models import failed: {e}')
    exit(1)

print('✅ All critical imports successful')
print('ℹ️  Using SQLite database (no PostgreSQL drivers needed)')
"

echo "🎉 Minimal build completed successfully!"