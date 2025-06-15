#!/bin/bash

# Itinerary Management System - Local Setup Script
echo "🚀 Setting up Itinerary Management System locally..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running in project directory
if [[ ! -f "README.md" ]] || [[ ! -d "backend" ]] || [[ ! -d "frontend" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Checking prerequisites..."

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d " " -f 2)
    print_status "Python found: $PYTHON_VERSION"
else
    print_error "Python 3 is required but not installed"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js is required but not installed"
    exit 1
fi

# Check yarn
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    print_status "Yarn found: $YARN_VERSION"
else
    print_warning "Yarn not found, installing..."
    npm install -g yarn
fi

# Check MongoDB
if command -v mongosh &> /dev/null; then
    print_status "MongoDB shell found"
elif command -v mongo &> /dev/null; then
    print_status "MongoDB (legacy shell) found"
else
    print_warning "MongoDB not found. Please install MongoDB first."
    echo "Visit: https://docs.mongodb.com/manual/installation/"
fi

print_status "Setting up backend..."

# Backend setup
cd backend

# Create virtual environment
if [[ ! -d "venv" ]]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install requirements
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env if it doesn't exist
if [[ ! -f ".env" ]]; then
    print_status "Creating backend .env file..."
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=itinerary_management
SECRET_KEY=your-super-secret-key-change-in-production-$(date +%s)
EOF
else
    print_warning "Backend .env file already exists"
fi

# Test imports
print_status "Testing backend dependencies..."
python -c "
try:
    import fastapi
    import motor
    import pymongo
    import uvicorn
    print('✅ All backend dependencies imported successfully!')
except ImportError as e:
    print(f'❌ Import error: {e}')
    exit(1)
"

cd ..

print_status "Setting up frontend..."

# Frontend setup
cd frontend

# Install dependencies
print_status "Installing Node.js dependencies..."
yarn install

# Create .env if it doesn't exist
if [[ ! -f ".env" ]]; then
    print_status "Creating frontend .env file..."
    cat > .env << EOF
WDS_SOCKET_PORT=443
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
else
    print_warning "Frontend .env file already exists"
fi

cd ..

print_status "Setup completed! 🎉"

echo ""
echo "📋 Next steps:"
echo "1. Start MongoDB:"
echo "   sudo systemctl start mongod"
echo ""
echo "2. Start backend (in one terminal):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
echo ""
echo "3. Start frontend (in another terminal):"
echo "   cd frontend"
echo "   yarn start"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "🔧 Or use the start script:"
echo "   ./scripts/start-local.sh"