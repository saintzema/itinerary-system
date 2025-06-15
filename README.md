# 🗓️ Itinerary Management System

> A comprehensive event scheduling and management system built with FastAPI (backend) and React (frontend), featuring real-time notifications, calendar views, and seamless user experience.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/yourusername/itinerary-management-system)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![Node.js](https://img.shields.io/badge/node.js-16+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-19.0-blue.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/fastapi-0.110+-green.svg)](https://fastapi.tiangolo.com)

## ✨ Features

### 🔐 **Authentication & Security**
- **Secure JWT Authentication** - Token-based authentication with automatic refresh
- **Role-based Access Control** - Admin, Staff, and User roles with different permissions
- **Protected Routes** - Secure API endpoints and frontend route protection
- **Password Security** - Bcrypt password hashing and validation

### 📅 **Event Management**
- **Full CRUD Operations** - Create, read, update, and delete events
- **Smart Calendar View** - Interactive monthly calendar with event display
- **Priority System** - Color-coded priority levels (High, Medium, Low)
- **Recurring Events** - Support for daily, weekly, and monthly recurrence
- **Conflict Detection** - Automatic detection of scheduling conflicts
- **Venue Management** - Location tracking for events

### 🔔 **Advanced Notifications**
- **Real-time Sound Alerts** - Audio notifications 5 minutes before events start
- **Browser Push Notifications** - Native browser notifications for upcoming events
- **In-app Notification Center** - Bell icon with unread count and notification history
- **Background Monitoring** - Continuous event time monitoring with cleanup

### 🎨 **Modern UI/UX**
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Tailwind CSS** - Modern, utility-first styling with custom components
- **Interactive Components** - Modal dialogs, dropdown menus, and form validation
- **Loading States** - Smooth loading indicators and error boundaries
- **Accessibility** - Screen reader friendly with proper ARIA labels

### 🏗️ **Technical Excellence**
- **Production Ready** - Comprehensive error handling and logging
- **Performance Optimized** - Database indexing, caching, and code splitting
- **Docker Support** - Complete containerization with docker-compose
- **Health Checks** - API health monitoring and status endpoints
- **Environment Flexibility** - Easy configuration for different environments

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Clone the repository
git clone https://github.com/yourusername/itinerary-management-system.git
cd itinerary-management-system

# Run one-command setup
chmod +x deploy-local.sh
./deploy-local.sh
```

### Option 2: Manual Setup
```bash
# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup  
cd ../frontend
yarn install

# Start services
npm run dev
```

## 🌐 Deployment

### Local Development
```bash
npm run setup    # Complete local setup
npm run dev      # Start development servers
npm run dev:stop # Stop all services
```

### Cloud Deployment

### 🚨 **VERCEL DEPLOYMENT FIX**

**If you get the error: `sh: line 1: cd: frontend: No such file found`**

**Quick Fix:**
```bash
# Use the deployment fix script
./fix-vercel-deployment.sh

# Or use the corrected frontend deployment
./deploy-vercel-frontend.sh
```

**Manual Fix in Vercel Dashboard:**
1. Go to vercel.com → Your Project → Settings → General
2. **⚠️ Change "Root Directory" from `./` to `frontend`**
3. Go to Deployments → Click "Redeploy" on latest deployment

#### Deploy to Vercel + Render (Recommended)
```bash
# Step 1: Deploy backend to Render (via dashboard)
# Step 2: Deploy frontend to Vercel (fixed script)
./deploy-vercel-frontend.sh

# Or use the automated fix
./fix-vercel-deployment.sh
```

#### Deploy with Docker
```bash
npm run docker:build  # Build containers
npm run docker:up     # Start all services
npm run docker:logs   # View logs
npm run docker:down   # Stop services
```

## 📋 System Requirements

- **Node.js** 16+ and yarn
- **Python** 3.11+
- **MongoDB** (local or Atlas)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   React Frontend│────│   FastAPI       │────│   MongoDB       │
│   (Port 3000)   │    │   Backend       │    │   Database      │
│                 │    │   (Port 8001)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Tech Stack

**Frontend:**
- React 19 with modern hooks and context
- Tailwind CSS for styling
- Axios for API communication
- React Router for navigation
- Web APIs for notifications and audio

**Backend:**
- FastAPI with async/await support
- MongoDB with Motor async driver
- JWT authentication with jose
- Password hashing with passlib
- Background tasks for notifications

**DevOps:**
- Docker and docker-compose
- Nginx reverse proxy
- Health checks and monitoring
- Environment-based configuration

## 🎯 Usage Guide

### Getting Started
1. **Register Account** - Create your user account
2. **Login** - Sign in with your credentials
3. **Create Events** - Add your first event with details
4. **View Calendar** - Navigate the monthly calendar view
5. **Get Notified** - Receive alerts before events start

### Key Features

#### Dashboard
- View upcoming events in card format
- Quick access to event details
- Create new events with one click
- Edit or delete existing events

#### Calendar View
- Monthly calendar with event display
- Color-coded events by priority
- Navigate between months easily
- Click events for detailed view

#### Event Management
- Comprehensive event creation form
- Set priority levels and recurrence
- Add venue and participant information
- Automatic conflict detection

#### Notifications
- Real-time sound alerts
- Browser push notifications
- In-app notification center
- Mark notifications as read

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=itinerary_management
SECRET_KEY=your-super-secret-key-here
DEBUG=false
```

**Frontend (.env)**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
GENERATE_SOURCEMAP=false
```

### Production Configuration
See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for complete production deployment guidelines.

## 🐛 Troubleshooting

### Common Issues

#### "ModuleNotFoundError: No module named 'motor'"
```bash
cd backend
source venv/bin/activate
pip install --force-reinstall motor pymongo
```

#### Frontend Build Errors
```bash
cd frontend
rm -rf node_modules package-lock.json
yarn install
yarn build
```

#### Database Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Test connection
mongosh --eval "db.adminCommand('ismaster')"
```

### Getting Help
- Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
- Review application logs
- Verify environment variables
- Test API endpoints manually

## 🧪 Testing

```bash
# Run all tests
npm run test:backend
npm run test:frontend

# Run specific tests
cd backend && python -m pytest tests/
cd frontend && yarn test --coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FastAPI** - For the excellent Python web framework
- **React** - For the robust frontend library
- **MongoDB** - For the flexible database solution
- **Tailwind CSS** - For the utility-first styling approach
- **Vercel** - For seamless frontend deployment
- **Render** - For reliable backend hosting

## 📞 Support

- **Documentation**: [Full documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/itinerary-management-system/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/itinerary-management-system/discussions)

---

**Built with ❤️ for efficient event management**

⭐ **Star this repository if it helped you!**