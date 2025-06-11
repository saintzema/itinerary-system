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
