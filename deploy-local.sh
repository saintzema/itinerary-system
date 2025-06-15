#!/bin/bash

# Enhanced Local Deployment Script for Itinerary Management System
# This script handles complete local setup with error checking and validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}🚀 $1${NC}"
    echo "----------------------------------------"
}

# Check if running in project directory
check_project_directory() {
    if [[ ! -f "README.md" ]] || [[ ! -d "backend" ]] || [[ ! -d "frontend" ]]; then
        print_error "Please run this script from the project root directory"
        print_info "The directory should contain: backend/, frontend/, README.md"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    print_header "Checking System Requirements"
    
    local missing_deps=()
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d " " -f 2)
        print_status "Python found: $PYTHON_VERSION"
    else
        missing_deps+=("python3")
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js found: $NODE_VERSION"
    else
        missing_deps+=("node")
    fi
    
    # Check yarn
    if command -v yarn &> /dev/null; then
        YARN_VERSION=$(yarn --version)
        print_status "Yarn found: $YARN_VERSION"
    else
        print_warning "Yarn not found, will install via npm"
        npm install -g yarn
    fi
    
    # Check MongoDB
    if command -v mongosh &> /dev/null; then
        print_status "MongoDB shell found"
    elif command -v mongo &> /dev/null; then
        print_status "MongoDB (legacy shell) found"
    else
        print_warning "MongoDB not found. Installing..."
        install_mongodb
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_info "Please install the missing dependencies and run this script again"
        exit 1
    fi
}

# Install MongoDB based on OS
install_mongodb() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_info "Installing MongoDB on Linux..."
        # Ubuntu/Debian
        if command -v apt &> /dev/null; then
            sudo apt update
            sudo apt install -y mongodb
        elif command -v yum &> /dev/null; then
            sudo yum install -y mongodb
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_info "Installing MongoDB on macOS..."
        if command -v brew &> /dev/null; then
            brew tap mongodb/brew
            brew install mongodb-community
        else
            print_error "Homebrew not found. Please install MongoDB manually."
            exit 1
        fi
    else
        print_warning "Please install MongoDB manually for your OS"
    fi
}

# Setup backend
setup_backend() {
    print_header "Setting Up Backend"
    
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [[ ! -d "venv" ]]; then
        print_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    print_info "Activating virtual environment..."
    source venv/bin/activate
    
    # Upgrade pip
    print_info "Upgrading pip..."
    pip install --upgrade pip --quiet
    
    # Install requirements
    print_info "Installing Python dependencies..."
    pip install -r requirements.txt --quiet
    
    # Create .env if it doesn't exist
    if [[ ! -f ".env" ]]; then
        print_info "Creating backend .env file..."
        cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=itinerary_management
SECRET_KEY=your-super-secret-key-change-in-production-$(date +%s)
EOF
    else
        print_warning "Backend .env file already exists"
    fi
    
    # Test imports
    print_info "Testing backend dependencies..."
    python -c "
import sys
try:
    import fastapi, motor, pymongo, uvicorn
    print('✅ All backend dependencies imported successfully!')
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
" || exit 1
    
    cd ..
    print_status "Backend setup completed"
}

# Setup frontend
setup_frontend() {
    print_header "Setting Up Frontend"
    
    cd frontend
    
    # Install dependencies
    print_info "Installing Node.js dependencies..."
    yarn install --silent
    
    # Create .env if it doesn't exist
    if [[ ! -f ".env" ]]; then
        print_info "Creating frontend .env file..."
        cat > .env << EOF
WDS_SOCKET_PORT=443
REACT_APP_BACKEND_URL=http://localhost:8001
GENERATE_SOURCEMAP=false
EOF
    else
        print_warning "Frontend .env file already exists"
    fi
    
    cd ..
    print_status "Frontend setup completed"
}

# Setup database
setup_database() {
    print_header "Setting Up Database"
    
    # Start MongoDB if not running
    if ! pgrep -x "mongod" > /dev/null; then
        print_info "Starting MongoDB..."
        if command -v systemctl &> /dev/null; then
            sudo systemctl start mongod
            sudo systemctl enable mongod
        elif command -v brew &> /dev/null; then
            brew services start mongodb/brew/mongodb-community
        else
            print_warning "Please start MongoDB manually"
        fi
        
        # Wait for MongoDB to start
        sleep 3
    fi
    
    # Test MongoDB connection
    if command -v mongosh &> /dev/null; then
        if mongosh --eval "db.adminCommand('ismaster')" --quiet > /dev/null 2>&1; then
            print_status "MongoDB is running and accessible"
        else
            print_error "Cannot connect to MongoDB"
            exit 1
        fi
    else
        print_warning "Cannot verify MongoDB connection (mongosh not available)"
    fi
}

# Health check function
health_check() {
    print_header "Running Health Checks"
    
    # Wait for services to start
    sleep 5
    
    # Check backend
    print_info "Checking backend health..."
    if curl -f http://localhost:8001/api/ > /dev/null 2>&1; then
        print_status "Backend is responding"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend
    print_info "Checking frontend health..."
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend is responding"
    else
        print_warning "Frontend might still be starting up"
    fi
    
    return 0
}

# Start services
start_services() {
    print_header "Starting Services"
    
    # Check if supervisor is available
    if command -v supervisorctl &> /dev/null; then
        print_info "Using supervisor to start services..."
        sudo supervisorctl restart all
        print_status "Services started with supervisor"
        
        # Show status
        print_info "Service status:"
        sudo supervisorctl status
    else
        print_warning "Supervisor not available. Starting services manually..."
        print_info "You'll need to start services in separate terminals:"
        echo ""
        echo "Terminal 1 - Backend:"
        echo "  cd backend"
        echo "  source venv/bin/activate"
        echo "  uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
        echo ""
        echo "Terminal 2 - Frontend:"
        echo "  cd frontend"
        echo "  yarn start"
        echo ""
        return 0
    fi
    
    # Run health checks
    if health_check; then
        print_status "All services are healthy!"
    else
        print_warning "Some services may not be ready yet"
    fi
}

# Create development scripts
create_dev_scripts() {
    print_header "Creating Development Scripts"
    
    # Create start script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
# Development start script

echo "🚀 Starting Itinerary Management System in development mode..."

# Start backend in background
echo "Starting backend..."
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
yarn start &
FRONTEND_PID=$!

cd ..

echo "✅ Services started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Application URLs:"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8001"
echo "API Docs: http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
EOF
    
    chmod +x start-dev.sh
    
    # Create stop script
    cat > stop-dev.sh << 'EOF'
#!/bin/bash
# Development stop script

echo "🛑 Stopping all development services..."

# Stop backend processes
pkill -f "uvicorn server:app"

# Stop frontend processes  
pkill -f "react-scripts start"

# Stop yarn processes
pkill -f "yarn start"

echo "✅ All services stopped"
EOF
    
    chmod +x stop-dev.sh
    
    print_status "Development scripts created"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "======================================"
    echo "🚀 Itinerary Management System Setup"
    echo "======================================"
    echo -e "${NC}"
    
    check_project_directory
    check_requirements
    setup_backend
    setup_frontend
    setup_database
    create_dev_scripts
    start_services
    
    echo ""
    print_header "🎉 Setup Complete!"
    
    echo -e "${GREEN}"
    echo "Your Itinerary Management System is ready!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8001"
    echo "   API Docs: http://localhost:8001/docs"
    echo ""
    echo "🛠️  Development commands:"
    echo "   Start:    ./start-dev.sh"
    echo "   Stop:     ./stop-dev.sh"
    echo "   Restart:  sudo supervisorctl restart all"
    echo ""
    echo "📚 Next steps:"
    echo "   1. Open http://localhost:3000 in your browser"
    echo "   2. Register a new account"
    echo "   3. Start creating events!"
    echo -e "${NC}"
}

# Run main function
main "$@"