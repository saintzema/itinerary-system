# 🚀 Quick Deployment Reference

## Local Development (Fastest)

```bash
# One-line setup and start
git clone <repo> && cd itinerary-management-system
chmod +x setup-local.sh start-local.sh
./setup-local.sh && ./start-local.sh
```

## Cloud Deployment Options

### 🔷 Vercel + Render (Recommended)
- **Frontend**: Vercel (free)
- **Backend**: Render (free tier available)
- **Database**: MongoDB Atlas (free tier)

### 🔷 Heroku (Full Stack)
- Both frontend and backend on Heroku
- Use MongoDB Atlas for database

### 🔷 Railway
- Both services on Railway
- Built-in database options available

## Environment Variables Quick Reference

### Backend
```env
MONGO_URL=mongodb://localhost:27017  # Local
# or mongodb+srv://user:pass@cluster.mongodb.net/  # Atlas
DB_NAME=itinerary_management
SECRET_KEY=your-secure-secret-key
```

### Frontend
```env
REACT_APP_BACKEND_URL=http://localhost:8001  # Local
# or https://your-backend.onrender.com  # Production
```

## Troubleshooting

### Motor Import Error
```bash
cd backend
source venv/bin/activate
export PYTHONPATH="$PWD:$PYTHONPATH"
pip install --force-reinstall motor pymongo
```

### Port Conflicts
```bash
lsof -ti:3000 -ti:8001 | xargs kill -9
```

### MongoDB Issues
```bash
sudo systemctl restart mongod
mongosh --eval "db.adminCommand('ismaster')"
```

## Quick Test Commands

```bash
# Test backend
curl http://localhost:8001/api/

# Test frontend
open http://localhost:3000

# Test full system
# 1. Register account
# 2. Create event
# 3. Check notifications
```