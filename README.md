# 🗓️ Itinerary Management System

> An AI Powered event scheduling and management system built with FastAPI (backend) and React (frontend), featuring real-time notifications, calendar views, and seamless user experience.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/yourusername/itinerary-management-system)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![Node.js](https://img.shields.io/badge/node.js-16+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-19.0-blue.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/fastapi-0.110+-green.svg)](https://fastapi.tiangolo.com)

### **Local Development Setup**

```bash
# 1. Clone the repository
git clone https://github.com/saintzema/itinerary-system.git
cd itinerary-system

# 2. Setup environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

Go to Backend and open the .env file, Paste the entire key below and remove the two quotation marks ""

#OPENAI_API_KEY=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"

# 3. Virtual Environment Setup
python3.9 -m venv venv
source venv/bin/activate

pip install --upgrade pip                             

# Backend Setup
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 4. Frontend setup (in another terminal)
cd frontend
yarn install
yarn start

# 7. Open your browser
# Frontend: http://localhost:3000
# Backend: http://localhost:8001/docs
```

### **Environment Configuration**

**Backend** (`backend/.env`):
```env
# For local development, leave DATABASE_URL empty (SQLite will be used)
DATABASE_URL=
SECRET_KEY=your-super-secret-key-here
DEBUG=true
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
GENERATE_SOURCEMAP=false
```

## ☁️ **Cloud Deployment**

### ** Option 1: Render + Vercel (Recommended)**

#### **Deploy Backend to Render:**
1. Create account at [render.com](https://render.com)
2. Create PostgreSQL database
3. Create Web Service from GitHub
4. Configure:
   ```
   Build Command: cd backend && pip install -r requirements.txt
   Start Command: cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT
   ```
5. Set environment variables:
   ```
   DATABASE_URL=postgresql://[from your PostgreSQL database]
   SECRET_KEY=your-secure-secret-key
   DEBUG=false
   ```

#### **Deploy Frontend to Vercel:**
1. Create account at [vercel.com](https://vercel.com)
2. Import GitHub repository
3. **⚠️ Set Root Directory to `frontend`**
4. Set environment variables:
   ```
   REACT_APP_BACKEND_URL=https://your-backend.onrender.com
   GENERATE_SOURCEMAP=false
   ```

### **Option 2: Railway (Full Stack)**
1. Create account at [railway.app](https://railway.app)
2. Deploy from GitHub repository
3. Add PostgreSQL database
4. Configure environment variables for both services

### **Option 3: Netlify + Railway**
Similar to Option 1, but use Netlify instead of Vercel for frontend.

**For detailed deployment instructions, see [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md)**

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   React Frontend│────│   FastAPI       │────│   SQLite/       │
│   (Port 3000)   │    │   Backend       │    │   PostgreSQL    │
│                 │    │   (Port 8001)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Tech Stack**

**Frontend:**
- React 19 with modern hooks and context
- Tailwind CSS for styling
- Axios for API communication
- React Router for navigation

**Backend:**
- FastAPI with SQLAlchemy ORM
- SQLite (local) / PostgreSQL (production)
- JWT authentication with jose
- Password hashing with passlib

**Deployment:**
- Multiple platform support (Render, Vercel, Railway, Netlify)
- Environment-based configuration
- Health checks and monitoring

## Usage Guide

### **Getting Started**
1. **Register Account** - Create your user account
2. **Login** - Sign in with your credentials
3. **Create Events** - Add your first event with details
4. **View Calendar** - Navigate the monthly calendar view
5. **Get Notified** - Receive alerts before events start

### **Key Features**

#### **Dashboard**
- View upcoming events in card format
- Quick access to event details
- Create new events with one click
- Edit or delete existing events

#### **Calendar View**
- Monthly calendar with event display
- Color-coded events by priority
- Navigate between months easily
- Click events for detailed view

#### **Event Management**
- Comprehensive event creation form
- Set priority levels and recurrence
- Add venue and participant information
- Automatic time validation

#### **Notifications**
- Real-time sound alerts
- Browser push notifications
- In-app notification center
- Mark notifications as read

## ✨ Features

### **Authentication & Security**
- **Secure JWT Authentication** - Token-based authentication with automatic refresh
- **User Registration & Login** - Complete user management system
- **Protected Routes** - Secure API endpoints and frontend route protection
- **Password Security** - Bcrypt password hashing and validation

### **Event Management**
- **Full CRUD Operations** - Create, read, update, and delete events
- **Smart Calendar View** - Interactive monthly calendar with event display
- **Priority System** - Color-coded priority levels (High, Medium, Low)
- **Recurring Events** - Support for daily, weekly, and monthly recurrence
- **Venue Management** - Location tracking for events

### **Advanced Notifications**
- **Real-time Sound Alerts** - Audio notifications 5 minutes before events start
- **Browser Push Notifications** - Native browser notifications for upcoming events
- **In-app Notification Center** - Bell icon with unread count and notification history
- **Background Monitoring** - Continuous event time monitoring

### **Modern UI/UX**
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Tailwind CSS** - Modern, utility-first styling with custom components
- **Interactive Components** - Modal dialogs, dropdown menus, and form validation
- **Loading States** - Smooth loading indicators and error boundaries

### **Technical Excellence**
- **Production Ready** - Comprehensive error handling and logging
- **Simple Database** - SQLite for local, PostgreSQL for production
- **Health Checks** - API health monitoring and status endpoints
- **Easy Deployment** - Multiple deployment options with detailed guides

## Quick Start

### **Prerequisites**
- **Node.js 16+** and **yarn**
- **Python 3.11+**
- **Git**

## 🔧 Configuration

### **Environment Variables**

**Backend** (`.env`):
```env
DATABASE_URL=postgresql://user:pass@host:5432/db  # Production only
OPEN_API_KEY=
SECRET_KEY=your-super-secret-key-here
DEBUG=false
```

**Frontend** (`.env`):
```env
REACT_APP_BACKEND_URL=https://your-backend-url.com
GENERATE_SOURCEMAP=false
```

### **Database Options**
- **Local Development**: SQLite (automatic, no setup)
- **Production**: PostgreSQL (provided by hosting platforms)

## 🐛 Troubleshooting

### **Common Issues**

#### **"Cannot connect to backend"**
1. Check `REACT_APP_BACKEND_URL` in frontend `.env`
2. Verify backend is running and accessible
3. Check CORS settings

#### **"Database connection failed"**
1. Verify `DATABASE_URL` format for production
2. For local: ensure backend directory is writable (SQLite)
3. Check database service status

#### **"Environment variables not working"**
1. Restart services after changing `.env` files
2. Verify exact variable names (case-sensitive)
3. Check platform-specific environment variable settings

**For detailed troubleshooting, see [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md)**

## 🧪 Testing

### **Local Testing**
```bash
# Backend health check
curl http://localhost:8001/api/health

# Complete user flow
# 1. Visit http://localhost:3000
# 2. Register new account
# 3. Login
# 4. Create event
# 5. Check calendar
```

### **Production Testing**
```bash
# Backend health check
curl https://your-backend-url/api/health

# Frontend functionality test
# 1. Visit your frontend URL
# 2. Test complete user flow
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **FastAPI** - For the excellent Python web framework
- **React** - For the robust frontend library
- **SQLAlchemy** - For the powerful ORM
- **Tailwind CSS** - For the utility-first styling approach

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/itinerary-management-system/issues)
- **Documentation**: [Deployment Guide](DEPLOYMENT_INSTRUCTIONS.md)

---

**Ready to deploy? Follow the [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md) for step-by-step guides!**

**Star this repository if it helped you!**