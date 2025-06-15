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

## 🚀 Quick Start & Local Deployment

### Prerequisites
- **Node.js 16+** and **yarn**
- **Python 3.11+** 
- **MongoDB** (local or Atlas)

### 🎯 Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd itinerary-management-system

# Run automated setup
chmod +x setup-local.sh
./setup-local.sh

# Start all services
chmod +x start-local.sh
./start-local.sh
```

### 🛠️ Option 2: Manual Setup

#### Step 1: Clone Repository
```bash
git clone <your-repo-url>
cd itinerary-management-system
```

#### Step 2: Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create environment file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=itinerary_management
SECRET_KEY=your-super-secret-key-change-in-production
EOF

# Test the setup
python -c "import motor, fastapi, uvicorn; print('✅ Backend setup successful!')"
```

#### Step 3: Frontend Setup
```bash
cd ../frontend

# Install dependencies
yarn install

# Create environment file
cat > .env << EOF
WDS_SOCKET_PORT=443
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Test the setup
yarn --version && echo "✅ Frontend setup successful!"
```

#### Step 4: Database Setup
```bash
# Start MongoDB (choose your platform)

# Ubuntu/Debian:
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS:
brew services start mongodb/brew/mongodb-community

# Windows:
net start MongoDB

# Test connection
mongosh --eval "db.adminCommand('ismaster')"
```

#### Step 5: Start Services

**Option A: Using Scripts (Recommended)**
```bash
# Start all services
./start-local.sh

# Or start individually
./start-local.sh backend   # Backend only
./start-local.sh frontend  # Frontend only
```

**Option B: Manual Start (3 separate terminals)**

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
export PYTHONPATH="$PWD:$PYTHONPATH"
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

**Terminal 3 - MongoDB (if not using system service):**
```bash
mongod --dbpath /path/to/your/data/directory
```

### 🌐 Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

### 🔧 Troubleshooting Local Setup

#### **"ModuleNotFoundError: No module named 'motor'" Fix:**

```bash
# Ensure virtual environment is activated
cd backend
source venv/bin/activate

# Verify you're in the right environment
which python
which pip

# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Test import specifically
python -c "import motor; print('Motor imported successfully!')"

# If still failing, try:
pip uninstall motor pymongo
pip install motor==3.3.1 pymongo==4.6.1

# Set Python path explicitly
export PYTHONPATH="$PWD:$PYTHONPATH"
```

#### **Port Already in Use:**
```bash
# Find and kill processes
lsof -ti:8001 | xargs kill -9  # Backend port
lsof -ti:3000 | xargs kill -9  # Frontend port
```

#### **MongoDB Connection Issues:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection manually
mongosh --eval "db.runCommand({connectionStatus : 1})"
```

#### **Permission Issues:**
```bash
# Fix permissions
chmod +x setup-local.sh start-local.sh
chmod -R 755 backend/ frontend/
sudo chown -R $USER:$USER .
```

## ☁️ Cloud Deployment

### 🔷 Vercel + Render Deployment (Recommended)

#### Deploy Frontend to Vercel:

1. **Prepare for Vercel:**
```bash
# Update vercel.json with your backend URL
# File is already created at project root
```

2. **Deploy to Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel --prod

# Or use Vercel dashboard:
# 1. Connect GitHub repo
# 2. Import project
# 3. Deploy automatically
```

#### Deploy Backend to Render:

1. **Create Render Account**: Visit [render.com](https://render.com)

2. **Deploy Backend:**
   - Connect your GitHub repository
   - Choose "Web Service"
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     ```
     MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname
     DB_NAME=itinerary_management
     SECRET_KEY=your-secure-secret-key-here
     ```

3. **Update Frontend Environment:**
```bash
# Update frontend/.env with your Render backend URL
REACT_APP_BACKEND_URL=https://your-app-name.onrender.com
```

### 🔷 Heroku Deployment

#### Backend to Heroku:
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set MONGO_URL="your-mongodb-atlas-url"
heroku config:set DB_NAME="itinerary_management"
heroku config:set SECRET_KEY="your-secret-key"

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### Frontend to Heroku:
```bash
# Create separate app for frontend
heroku create your-frontend-app

# Set backend URL
heroku config:set REACT_APP_BACKEND_URL="https://your-backend-app.herokuapp.com"

# Add buildpack
heroku buildpacks:set mars/create-react-app

# Deploy
git subtree push --prefix frontend heroku main
```

### 🔷 Railway Deployment

1. **Visit [railway.app](https://railway.app)**
2. **Connect GitHub repository**
3. **Deploy backend and frontend as separate services**
4. **Set environment variables in Railway dashboard**

### 🔷 DigitalOcean App Platform

1. **Visit [DigitalOcean Apps](https://cloud.digitalocean.com/apps)**
2. **Connect GitHub repository**
3. **Configure build and run commands**
4. **Set environment variables**

## 🗄️ Database Setup for Cloud Deployment

### MongoDB Atlas (Recommended for Cloud):

1. **Create Account**: Visit [mongodb.com](https://www.mongodb.com/)
2. **Create Cluster**: Choose shared (free) tier
3. **Create User**: Add database user with read/write permissions
4. **Whitelist IP**: Add `0.0.0.0/0` for cloud deployments
5. **Get Connection String**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/itinerary_management
   ```

### Environment Variables for Production:

**Backend (.env or cloud platform settings):**
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=itinerary_management
SECRET_KEY=your-super-secure-secret-key-for-production
```

**Frontend (.env or cloud platform settings):**
```env
REACT_APP_BACKEND_URL=https://your-backend-domain.com
```

## 🔒 Production Security Checklist

- [ ] Change default SECRET_KEY
- [ ] Use environment variables for all sensitive data
- [ ] Enable HTTPS/SSL
- [ ] Set up proper CORS origins
- [ ] Use MongoDB Atlas with authentication
- [ ] Set up proper firewall rules
- [ ] Enable rate limiting
- [ ] Regular security updates

## 📊 Quick Deployment Commands Summary

```bash
# Local Development
./setup-local.sh && ./start-local.sh

# Vercel Frontend
vercel --prod

# Render Backend
# Use dashboard with:
# Build: pip install -r requirements.txt
# Start: uvicorn server:app --host 0.0.0.0 --port $PORT

# Heroku Full Stack
heroku create app-backend && heroku create app-frontend
git push heroku main
```

## 🎯 Post-Deployment Testing

1. **Test Registration**: Create a new account
2. **Test Login**: Sign in with credentials
3. **Test Events**: Create, edit, delete events
4. **Test Notifications**: Verify sound alerts work
5. **Test Mobile**: Check responsive design

**Your application is now ready for local development and cloud deployment! 🚀**

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
