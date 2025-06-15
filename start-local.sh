#!/bin/bash

# Itinerary Management System - Local Start Script
echo "🚀 Starting Itinerary Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if setup was run
if [[ ! -d "backend/venv" ]]; then
    print_error "Virtual environment not found. Please run ./setup-local.sh first"
    exit 1
fi

if [[ ! -f "backend/.env" ]] || [[ ! -f "frontend/.env" ]]; then
    print_error "Environment files not found. Please run ./setup-local.sh first"
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    print_warning "MongoDB doesn't seem to be running. Starting it..."
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mongod
    elif command -v brew &> /dev/null; then
        brew services start mongodb/brew/mongodb-community
    else
        print_error "Please start MongoDB manually"
        exit 1
    fi
fi

# Test MongoDB connection
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.adminCommand('ismaster')" --quiet > /dev/null 2>&1; then
        print_status "MongoDB is running and accessible"
    else
        print_error "Cannot connect to MongoDB"
        exit 1
    fi
fi

# Function to start backend
start_backend() {
    echo "Starting backend server..."
    cd backend
    source venv/bin/activate
    export PYTHONPATH="$PWD:$PYTHONPATH"
    uvicorn server:app --host 0.0.0.0 --port 8001 --reload
}

# Function to start frontend
start_frontend() {
    echo "Starting frontend server..."
    cd frontend
    yarn start
}

# Check if we should start both or individual services
case "${1:-all}" in
    "backend")
        start_backend
        ;;
    "frontend")
        start_frontend
        ;;
    "all"|*)
        echo "Starting both backend and frontend..."
        echo "Backend will start in background, frontend in foreground"
        echo "Press Ctrl+C to stop both services"
        
        # Start backend in background
        start_backend &
        BACKEND_PID=$!
        
        # Wait a moment for backend to start
        sleep 3
        
        # Start frontend in foreground
        start_frontend
        
        # When frontend stops, kill backend
        kill $BACKEND_PID 2>/dev/null
        ;;
esac