#!/bin/bash

# Simple Deployment Script - SQLite + PostgreSQL Solution
# This script sets up the simplified database solution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}🚀 $1${NC}"
    echo "=========================================="
}

print_header "Simple Deployment Setup - Itinerary Management System"

echo -e "${GREEN}🎉 NEW SIMPLIFIED DATABASE SOLUTION!${NC}"
echo ""
echo -e "${BLUE}✅ Local Development:${NC} SQLite (no setup required)"
echo -e "${BLUE}✅ Production:${NC} PostgreSQL (Render provides free)"
echo -e "${BLUE}✅ Zero Configuration:${NC} Works everywhere immediately"
echo ""

print_header "📋 What's New"

echo "✅ Replaced MongoDB with SQLite/PostgreSQL"
echo "✅ No more SSL handshake issues"
echo "✅ No more external database setup"
echo "✅ No more bcrypt compilation problems"
echo "✅ Automatic database creation"
echo "✅ Simple deployment process"
echo ""

print_header "🚀 Local Development Setup"

echo ""
print_info "Setting up backend with SQLite..."

cd backend

# Check if virtual environment exists
if [[ ! -d "venv" ]]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
print_info "Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

print_status "Backend dependencies installed"

# Test database creation
print_info "Testing database setup..."
python -c "from database import create_tables; create_tables(); print('✅ Database tables created successfully')"

cd ..

print_info "Setting up frontend..."
cd frontend
yarn install
print_status "Frontend dependencies installed"

cd ..

print_header "🧪 Testing Local Setup"

echo ""
print_info "Starting backend server..."

# Start backend in background
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

cd ..

# Wait for backend to start
sleep 5

# Test backend health
print_info "Testing backend health..."
if curl -f http://localhost:8001/api/health > /dev/null 2>&1; then
    print_status "Backend is healthy!"
    
    # Show health response
    echo ""
    echo -e "${BLUE}Health Check Response:${NC}"
    curl -s http://localhost:8001/api/health | python -m json.tool
    echo ""
else
    print_error "Backend health check failed"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

print_header "🎉 Local Setup Complete!"

echo ""
echo -e "${GREEN}Your itinerary management system is ready!${NC}"
echo ""
echo -e "${BLUE}🌐 Local URLs:${NC}"
echo "Backend:  http://localhost:8001"
echo "API Docs: http://localhost:8001/docs"
echo "Health:   http://localhost:8001/api/health"
echo ""
echo -e "${BLUE}📁 Database:${NC}"
echo "SQLite file: backend/itinerary.db (created automatically)"
echo ""

print_header "🚀 Next Steps"

echo ""
echo -e "${YELLOW}For Frontend:${NC}"
echo "1. Open new terminal"
echo "2. cd frontend"
echo "3. yarn start"
echo "4. Visit http://localhost:3000"
echo ""
echo -e "${YELLOW}For Production Deployment:${NC}"
echo "1. Deploy backend to Render (with PostgreSQL)"
echo "2. Deploy frontend to Vercel"
echo "3. Follow SIMPLE_DEPLOYMENT_GUIDE.md"
echo ""

print_header "🔧 Useful Commands"

echo ""
echo -e "${BLUE}Start backend:${NC}"
echo "cd backend && source venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
echo ""
echo -e "${BLUE}Start frontend:${NC}"
echo "cd frontend && yarn start"
echo ""
echo -e "${BLUE}Check database:${NC}"
echo "ls -la backend/itinerary.db"
echo ""
echo -e "${BLUE}Test health:${NC}"
echo "curl http://localhost:8001/api/health"
echo ""

print_status "Setup completed successfully!"
print_info "Your stress-free deployment solution is ready! 🎉"

# Keep backend running
echo ""
echo -e "${YELLOW}Backend is running in background (PID: $BACKEND_PID)${NC}"
echo -e "${YELLOW}Start frontend in another terminal to test complete system${NC}"
echo ""
echo "Press Ctrl+C to stop backend and exit"

# Wait for Ctrl+C
trap "echo 'Stopping backend...'; kill $BACKEND_PID 2>/dev/null; exit" INT
wait