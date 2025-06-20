#!/bin/bash

# Render Build Script - Ensures Python 3.10 compatibility
echo "🚀 Starting Render deployment build..."

# Check Python version
echo "Current Python version:"
python --version

# Check if we have Python 3.10
if python --version 2>&1 | grep -q "3.10"; then
    echo "✅ Python 3.10 detected"
else
    echo "⚠️  Warning: Not using Python 3.10, may cause compatibility issues"
fi

# Change to backend directory
cd backend || exit 1

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies without psycopg2 to avoid binary compatibility issues
echo "📦 Installing dependencies..."
pip install -r requirements-render.txt

# Verify critical imports
echo "🧪 Testing critical imports..."
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
"

echo "🎉 Build completed successfully!"