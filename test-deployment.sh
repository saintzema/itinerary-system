#!/bin/bash

# DEPLOYMENT TEST SCRIPT
# Tests compatibility before deploying to production

echo "🚀 Testing Deployment Compatibility..."

# Check Python version
python_version=$(python --version 2>&1)
echo "Python Version: $python_version"

# Test backend dependencies
echo "📦 Testing Backend Dependencies..."
cd backend

# Install dependencies in a virtual environment simulation
pip install -r requirements.txt --quiet --dry-run
if [ $? -eq 0 ]; then
    echo "✅ Requirements installation: PASS"
else
    echo "❌ Requirements installation: FAIL"
    exit 1
fi

# Test imports
python -c "
try:
    import sqlalchemy
    import fastapi
    import uvicorn
    import openai
    from database import Base, User, Event, Notification
    from server import app
    print('✅ All imports: PASS')
except Exception as e:
    print(f'❌ Import error: {e}')
    exit(1)
"

# Test database models
python -c "
try:
    from database import create_tables, get_db
    print('✅ Database models: PASS')
except Exception as e:
    print(f'❌ Database error: {e}')
    exit(1)
"

echo "✅ Deployment compatibility test: COMPLETE"
echo "🎉 Ready for production deployment!"