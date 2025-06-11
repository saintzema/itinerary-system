# Itinerary Management System - Deployment Guide

## 🚀 Quick Deployment Instructions

Your itinerary management system is now fully functional and ready for deployment! Here are the deployment options:

### **Current System Status:**
- ✅ Backend API: FastAPI running on port 8001
- ✅ Frontend: React app running on port 3000  
- ✅ Database: MongoDB (local instance)
- ✅ Authentication: JWT-based user system
- ✅ Notifications: Sound alerts + browser notifications

---

## **Option 1: Docker Deployment (Recommended)**

Create these files in your project root:

### **Dockerfile.backend**
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### **Dockerfile.frontend**
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install

COPY frontend/ .
RUN yarn build

FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

### **docker-compose.yml**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=itinerary_management
    depends_on:
      - mongodb

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001

volumes:
  mongodb_data:
```

**Deploy with:**
```bash
docker-compose up -d
```

---

## **Option 2: Cloud Platform Deployment**

### **Heroku Deployment**
1. Install Heroku CLI
2. Create `Procfile`:
```
web: uvicorn backend.server:app --host=0.0.0.0 --port=$PORT
```
3. Add MongoDB Atlas connection string to environment variables
4. Deploy:
```bash
git init
heroku create your-app-name
git add .
git commit -m "Initial deployment"
git push heroku main
```

### **Railway/Render Deployment**
1. Connect your GitHub repository
2. Set environment variables:
   - `MONGO_URL`: Your MongoDB connection string
   - `DB_NAME`: itinerary_management
3. Deploy backend and frontend as separate services

### **Vercel (Frontend) + Railway (Backend)**
1. Deploy frontend to Vercel:
   - Connect GitHub repo
   - Auto-deploy from main branch
2. Deploy backend to Railway:
   - Connect GitHub repo  
   - Set MongoDB environment variables

---

## **Option 3: VPS Deployment**

### **Server Setup (Ubuntu/Debian)**
```bash
# Install dependencies
sudo apt update
sudo apt install nodejs npm python3 python3-pip mongodb nginx

# Clone your repository
git clone <your-repo-url>
cd itinerary-system

# Backend setup
cd backend
pip3 install -r requirements.txt
# Set environment variables in .env file

# Frontend setup  
cd ../frontend
npm install
npm run build

# Setup nginx reverse proxy
sudo nano /etc/nginx/sites-available/itinerary
```

### **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **PM2 Process Management**
```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start "uvicorn server:app --host 0.0.0.0 --port 8001" --name backend

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## **Environment Variables Setup**

### **Backend (.env)**
```env
MONGO_URL=mongodb://localhost:27017
# OR for MongoDB Atlas:
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=itinerary_management
SECRET_KEY=your-secure-secret-key-here
```

### **Frontend (.env)**
```env
REACT_APP_BACKEND_URL=https://your-backend-domain.com
# OR for local development:
# REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## **Database Options**

### **Option A: MongoDB Atlas (Cloud)**
1. Create account at mongodb.com
2. Create new cluster
3. Get connection string
4. Update MONGO_URL in backend .env

### **Option B: Local MongoDB**
```bash
# Install MongoDB
sudo apt install mongodb

# Start service
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### **Option C: Docker MongoDB**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

---

## **SSL/HTTPS Setup**

### **Let's Encrypt (Free SSL)**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## **Monitoring & Maintenance**

### **Health Checks**
- Backend: `curl https://your-domain.com/api/`
- Frontend: Check website loads correctly
- Database: Monitor connection logs

### **Backup Strategy**
```bash
# MongoDB backup
mongodump --db itinerary_management --out backup/

# Restore
mongorestore backup/itinerary_management/
```

---

## **Performance Optimization**

### **Frontend Optimization**
```bash
# Build optimized version
npm run build

# Serve with compression
# Add to nginx config:
gzip on;
gzip_types text/css application/javascript application/json;
```

### **Backend Optimization**
- Use gunicorn for production: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app`
- Enable Redis for caching (optional)
- Set up database indexing

---

## **Security Checklist**

- ✅ Change default SECRET_KEY in production
- ✅ Use environment variables for sensitive data
- ✅ Enable HTTPS/SSL
- ✅ Set up firewall rules
- ✅ Regular security updates
- ✅ MongoDB authentication enabled
- ✅ CORS configured properly

---

## **Support & Troubleshooting**

### **Common Issues:**
1. **CORS errors**: Check REACT_APP_BACKEND_URL matches actual backend URL
2. **Database connection**: Verify MONGO_URL and database accessibility
3. **404 errors**: Ensure nginx routing is configured correctly
4. **Permission errors**: Check file permissions and user access

### **Logs Location:**
- Backend: Check application logs
- Frontend: Browser developer console
- Nginx: `/var/log/nginx/error.log`
- MongoDB: `/var/log/mongodb/mongod.log`

---

## **What's Working Now:**

✅ **Authentication**: Registration, login, protected routes  
✅ **Event Management**: Create, edit, delete, view events  
✅ **Notifications**: Sound alerts, browser notifications, in-app notifications  
✅ **UI/UX**: Responsive design, modals, forms  
✅ **Security**: JWT tokens, input validation  
✅ **Database**: MongoDB integration with proper data models  

Your system is production-ready! Choose the deployment option that best fits your needs and budget.