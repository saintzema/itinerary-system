# Itinerary Management System

A comprehensive event scheduling and management system built with FastAPI (backend) and React (frontend).

## ✨ Features

### 🔐 **Authentication System**
- User registration and login
- JWT-based authentication
- Role-based access control (Admin, Staff, User)
- Protected routes and secure API endpoints

### 📅 **Event Management**
- Create, edit, and delete events
- Event scheduling with conflict detection
- Priority levels (High, Medium, Low)
- Recurring events support
- Venue and participant management

### 🔔 **Advanced Notifications**
- **Real-time sound alerts** when events are about to start (5 minutes before)
- **Browser push notifications** for upcoming events
- **In-app notification system** with bell icon
- Notification history and read/unread status

### 🎨 **Modern UI/UX**
- Responsive design with Tailwind CSS
- Interactive event cards and modals
- Calendar view (coming soon)
- Dashboard with event overview
- Clean, professional interface

### 📊 **Additional Features**
- Event reports and analytics (coming soon)
- User management for admins
- Real-time updates
- Mobile-responsive design

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and yarn
- Python 3.11+
- MongoDB

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd itinerary-management-system
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt

# Create .env file
echo "MONGO_URL=mongodb://localhost:27017" > .env
echo "DB_NAME=itinerary_management" >> .env
```

3. **Frontend Setup**
```bash
cd frontend
yarn install

# Create .env file
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

4. **Start the services**
```bash
# Start backend (from backend directory)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Start frontend (from frontend directory)
yarn start

# Start MongoDB
sudo systemctl start mongodb
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Documentation: http://localhost:8001/docs

## 💻 Local Development Setup (Detailed)

### Step 1: Install Prerequisites

#### **On Ubuntu/Debian:**
```bash
# Update package list
sudo apt update

# Install Node.js and yarn
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g yarn

# Install Python 3.11
sudo apt install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt install python3.11 python3.11-pip python3.11-venv

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### **On macOS:**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and yarn
brew install node
npm install -g yarn

# Install Python 3.11
brew install python@3.11

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### **On Windows:**
```powershell
# Install using Chocolatey (run as Administrator)
# Install Chocolatey first: https://chocolatey.org/install

# Install Node.js and yarn
choco install nodejs
npm install -g yarn

# Install Python 3.11
choco install python --version=3.11.0

# Install MongoDB
choco install mongodb

# Start MongoDB service
net start MongoDB
```

### Step 2: Clone and Setup Project

```bash
# Clone the repository
git clone <your-repo-url>
cd itinerary-management-system

# Verify directory structure
ls -la
# Should show: backend/ frontend/ README.md DEPLOYMENT_GUIDE.md
```

### Step 3: Backend Setup (Python/FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create environment file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=itinerary_management
SECRET_KEY=your-super-secret-key-change-in-production
EOF

# Verify backend setup
python -c "import fastapi, motor, pymongo; print('All dependencies installed successfully!')"
```

### Step 4: Frontend Setup (React)

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install Node.js dependencies
yarn install

# Create environment file
cat > .env << EOF
WDS_SOCKET_PORT=443
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Verify frontend setup
yarn --version
node --version
```

### Step 5: Database Setup (MongoDB)

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ismaster')"

# If connection successful, create database (optional - will be created automatically)
mongosh
use itinerary_management
show dbs
exit
```

### Step 6: Start All Services

#### **Option A: Using Supervisor (Recommended)**
```bash
# Check if supervisor is installed
sudo supervisorctl status

# If available, start all services
sudo supervisorctl start all
sudo supervisorctl status
```

#### **Option B: Manual Start (3 separate terminals)**

**Terminal 1 - MongoDB:**
```bash
# Start MongoDB (if not already running)
sudo systemctl start mongod
# Or on macOS: brew services start mongodb/brew/mongodb-community
# Or on Windows: net start MongoDB

# Verify MongoDB is running
mongosh --eval "db.adminCommand('ismaster')"
```

**Terminal 2 - Backend:**
```bash
cd backend
source venv/bin/activate  # If using virtual environment
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
# INFO:     Started reloader process
# INFO:     Started server process
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.
```

**Terminal 3 - Frontend:**
```bash
cd frontend
yarn start

# You should see:
# Compiled successfully!
# You can now view frontend in the browser.
# Local: http://localhost:3000
```

### Step 7: Verify Installation

1. **Backend API Test:**
```bash
# Test backend API
curl http://localhost:8001/api/
# Should return: {"message":"Hello from the Itinerary Management System API"}

# Check API documentation
open http://localhost:8001/docs  # macOS
# Or visit http://localhost:8001/docs in your browser
```

2. **Frontend Test:**
```bash
# Open frontend in browser
open http://localhost:3000  # macOS
# Or visit http://localhost:3000 in your browser
```

3. **Full System Test:**
   - Visit http://localhost:3000
   - Click "Register" and create a new account
   - Login with your credentials
   - Create a test event
   - Verify notifications work

### Step 8: Development Workflow

```bash
# Backend development (with auto-reload)
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend development (with hot reload)
cd frontend
yarn start

# View logs in real-time
tail -f /var/log/supervisor/backend*.log  # If using supervisor
tail -f /var/log/supervisor/frontend*.log
```

### 🔧 Troubleshooting Local Setup

#### **MongoDB Issues:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB if stopped
sudo systemctl start mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh --eval "db.runCommand({connectionStatus : 1})"
```

#### **Backend Issues:**
```bash
# Check Python version
python3.11 --version

# Check if all packages are installed
pip list | grep -E "(fastapi|uvicorn|motor|pymongo)"

# Test backend directly
cd backend
python -c "from server import app; print('Backend imports successfully')"

# Check backend logs
tail -f /var/log/supervisor/backend*.log
```

#### **Frontend Issues:**
```bash
# Check Node.js and yarn versions
node --version  # Should be 16+
yarn --version

# Clear cache and reinstall
yarn cache clean
rm -rf node_modules package-lock.json
yarn install

# Check frontend logs
tail -f /var/log/supervisor/frontend*.log
```

#### **Port Conflicts:**
```bash
# Check what's running on ports
lsof -i :3000  # Frontend port
lsof -i :8001  # Backend port
lsof -i :27017 # MongoDB port

# Kill processes if needed
sudo kill -9 <PID>
```

#### **Permission Issues:**
```bash
# Fix file permissions
chmod +x backend/server.py
chmod -R 755 frontend/src/

# Fix ownership (if needed)
sudo chown -R $USER:$USER .
```

### 🎯 Quick Commands Summary

```bash
# Start everything (with supervisor)
sudo supervisorctl restart all

# Start manually
# Terminal 1: MongoDB
sudo systemctl start mongod

# Terminal 2: Backend
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3: Frontend
cd frontend && yarn start

# Check status
curl http://localhost:8001/api/  # Backend
open http://localhost:3000       # Frontend
```

### 🚀 Ready to Use!

Once all services are running:
1. Visit **http://localhost:3000**
2. **Register** a new account
3. **Login** and start creating events
4. **Test notifications** by creating events with start times in the near future
5. **Enjoy** your fully functional itinerary management system!

**Your local development environment is now ready! 🎉**

## 📁 Project Structure

```
itinerary-management-system/
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   ├── App.css       # Styles
│   │   └── index.js      # Entry point
│   ├── package.json      # Node.js dependencies
│   └── .env              # Environment variables
└── README.md
```

## 🔧 Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **MongoDB**: NoSQL database with Motor driver
- **JWT**: JSON Web Tokens for authentication
- **Pydantic**: Data validation and serialization
- **Uvicorn**: ASGI server

### Frontend
- **React 19**: Modern React with hooks
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API calls
- **React Router**: Client-side routing
- **Web APIs**: Notifications and Audio APIs

## 🎯 Usage

### Creating Your First Event

1. **Register/Login**: Create an account or sign in
2. **Navigate to Dashboard**: View your events overview
3. **Create Event**: Click "Create New Event" button
4. **Fill Details**: Add title, description, time, venue, priority
5. **Save**: Event will appear in your dashboard
6. **Get Notified**: Receive sound alerts 5 minutes before event starts

### Managing Notifications

- **Bell Icon**: Click to view all notifications
- **Event Alerts**: Automatic notifications for upcoming events
- **Browser Permissions**: Allow notifications for best experience
- **Sound Alerts**: Automatic audio notifications for imminent events

## 🔐 API Endpoints

### Authentication
- `POST /api/token` - User login
- `POST /api/users` - User registration
- `GET /api/users/me` - Get current user

### Events
- `GET /api/events` - List user events
- `POST /api/events` - Create new event
- `GET /api/events/{id}` - Get event details
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/{id}/read` - Mark as read

## 🛠️ Development

### Environment Variables

**Backend (.env)**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=itinerary_management
SECRET_KEY=your-secret-key-here
```

**Frontend (.env)**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Running Tests

```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
yarn test
```

## 🚀 Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions including:

- Docker deployment
- Cloud platforms (Heroku, Railway, Vercel)
- VPS deployment
- SSL setup
- Production optimization

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MongoDB is running
   - Check MONGO_URL in backend/.env

2. **CORS Errors**
   - Verify REACT_APP_BACKEND_URL matches backend URL
   - Check backend CORS configuration

3. **Notification Permissions**
   - Allow browser notifications when prompted
   - Check browser notification settings

4. **Sound Not Playing**
   - Ensure browser allows audio autoplay
   - Check if user has interacted with the page first

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎉 Acknowledgments

- FastAPI for the excellent Python web framework
- React team for the robust frontend library
- MongoDB for the flexible database solution
- Tailwind CSS for the utility-first styling

---

**Built with ❤️ for efficient event management**
