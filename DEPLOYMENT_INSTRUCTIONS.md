# Complete Deployment Instructions

## **Prerequisites**

Before deploying, you need:
- GitHub account with your repository
- Accounts on your chosen platforms (Render/Vercel, etc.)

## **Local Development Setup**

### Step 1: Clone and Setup

```bash
# Clone your repository
git clone https://github.com/saintzema/itinerary-system.git
cd itinerary-system

# Copy environment files and configure
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Step 2: Configure Local Environment

**Backend Configuration** (`backend/.env`):
```env
# Leave DATABASE_URL empty for local development (SQLite will be used)
DATABASE_URL=

# Generate a secure secret key
SECRET_KEY=your-super-secret-key-change-this

# Set debug mode for development
DEBUG=true
```

**Frontend Configuration** (`frontend/.env`):
```env
# Local backend URL
REACT_APP_BACKEND_URL=http://localhost:8001
GENERATE_SOURCEMAP=false
WDS_SOCKET_PORT=443
```

### Step 3: Install Dependencies and Run

```bash
# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start backend (in one terminal)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend setup (in another terminal)
cd frontend
yarn install

# Start frontend
yarn start
```

### Step 4: Test Local Setup

- Backend: http://localhost:8001/api/health
- Frontend: http://localhost:3000

## ☁️ **Production Deployment**

### **Option 1: Render (Backend) + Vercel (Frontend) - Recommended**

#### **Step A: Deploy Backend to Render**

1. **Create Render Account**: Go to [render.com](https://render.com)

2. **Create PostgreSQL Database**:
   - Click "New" → "PostgreSQL"
   - Name: `itinerary-database`
   - Plan: Free
   - Note down the "Internal Database URL"

3. **Create Web Service**:
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - **Configuration**:
     ```
     Name: itinerary-backend
     Build Command: cd backend && pip install -r requirements.txt
     Start Command: cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT
     ```

4. **Environment Variables**:
   ```
   DATABASE_URL=postgresql://username:password@hostname:port/database_name
   SECRET_KEY=your-secure-secret-key-here
   DEBUG=false
   ```
   
   **How to get DATABASE_URL**:
   - Copy the "Internal Database URL" from your PostgreSQL database
   - It looks like: `postgresql://username:password@hostname:port/database_name`

5. **Deploy and Test**:
   - Wait for deployment to complete
   - Test: `https://your-backend.onrender.com/api/health`
   - Note your backend URL for frontend configuration

#### **Step B: Deploy Frontend to Vercel**

1. **Create Vercel Account**: Go to [vercel.com](https://vercel.com)

2. **Import Project**:
   - Click "New Project"
   - Import your GitHub repository
   - **⚠️ CRITICAL**: Set "Root Directory" to `frontend`

3. **Environment Variables**:
   ```
   REACT_APP_BACKEND_URL=https://your-backend.onrender.com
   GENERATE_SOURCEMAP=false
   ```
   
   **How to get REACT_APP_BACKEND_URL**:
   - Use your Render backend URL from Step A
   - Example: `https://itinerary-backend.onrender.com`

4. **Deploy and Test**:
   - Wait for deployment to complete
   - Test: Visit your Vercel URL
   - Try registering and logging in

### **Option 2: Railway (Full Stack)**

1. **Create Railway Account**: Go to [railway.app](https://railway.app)

2. **Deploy from GitHub**:
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects both frontend and backend

3. **Add PostgreSQL Database**:
   - Click "New" → "PostgreSQL"
   - Railway provides connection URL automatically

4. **Configure Backend Environment**:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   SECRET_KEY=your-secure-secret-key-here
   DEBUG=false
   ```

5. **Configure Frontend Environment**:
   ```
   REACT_APP_BACKEND_URL=https://${{backend-service.RAILWAY_STATIC_URL}}
   GENERATE_SOURCEMAP=false
   ```

### **Option 3: Netlify (Frontend) + Railway (Backend)**

#### **Railway Backend**:
- Same as Option 2, but deploy only backend service

#### **Netlify Frontend**:

1. **Create Netlify Account**: Go to [netlify.com](https://netlify.com)

2. **Deploy Site**:
   - Click "Add new site" → "Import from Git"
   - Connect GitHub repository

3. **Build Settings**:
   ```
   Base directory: frontend
   Build command: yarn build
   Publish directory: frontend/build
   ```

4. **Environment Variables**:
   ```
   REACT_APP_BACKEND_URL=https://your-backend.up.railway.app
   ```

## **Environment Variables Guide**

### **Backend Environment Variables**

| Variable | Description | How to Get | Example |
|----------|-------------|------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | From hosting provider's database | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY` | JWT signing key | Generate random string | `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `DEBUG` | Debug mode | Set manually | `false` for production |

### **Frontend Environment Variables**

| Variable | Description | How to Get | Example |
|----------|-------------|------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | From backend deployment | `https://your-backend.onrender.com` |
| `GENERATE_SOURCEMAP` | Build optimization | Set manually | `false` for production |

## 🧪 **Testing Your Deployment**

### **Health Checks**

1. **Backend Health**:
   ```bash
   curl https://your-backend-url/api/health
   
   # Should return:
   {
     "status": "healthy",
     "database": "healthy",
     "timestamp": "...",
     "version": "1.0.0"
   }
   ```

2. **Frontend Test**:
   - Visit your frontend URL
   - Should load the login/registration page
   - Try creating an account
   - Test login functionality

### **Complete User Flow Test**

1. **Registration**: Create a new account
2. **Login**: Sign in with your credentials
3. **Dashboard**: View events dashboard
4. **Create Event**: Add a new event
5. **Calendar**: Check calendar view
6. **Notifications**: Verify notification system

## **Troubleshooting**

### **Common Issues**

1. **Backend Won't Start**:
   - Check `DATABASE_URL` is correct
   - Verify all environment variables are set
   - Check build logs for Python errors

2. **Frontend Can't Connect to Backend**:
   - Verify `REACT_APP_BACKEND_URL` is correct
   - Ensure backend is deployed and healthy
   - Check for CORS errors in browser console

3. **Database Connection Failed**:
   - Verify PostgreSQL database is running
   - Check `DATABASE_URL` format
   - Ensure database allows connections

4. **Environment Variables Not Working**:
   - Verify exact variable names (case-sensitive)
   - Restart/redeploy after changing variables
   - Check platform-specific documentation

## 📁 **File Checklist**

Before deployment, ensure you have:

- [ ] `backend/.env` configured (or environment variables set on platform)
- [ ] `frontend/.env` configured (or environment variables set on platform)
- [ ] All dependencies listed in `requirements.txt` and `package.json`
- [ ] Repository pushed to GitHub
- [ ] Platform accounts created (Render, Vercel, etc.)

## **Platform-Specific Notes**

### **Render**
- Free tier has limitations (sleeps after inactivity)
- PostgreSQL database is free with 1GB storage
- Build time can be slower on free tier

### **Vercel**
- Excellent for React frontends
- Must set root directory to `frontend`
- Environment variables are build-time only

### **Railway**
- $5/month free credit
- Great for full-stack deployment
- Automatic PostgreSQL integration

### **Netlify**
- Great alternative to Vercel
- Similar setup process
- Good free tier for frontends

## **Success Indicators**

You know deployment is successful when:

- ✅ Backend health check returns "healthy"
- ✅ Frontend loads without errors
- ✅ User registration works
- ✅ Login functionality works
- ✅ Events can be created and viewed
- ✅ Calendar displays properly
- ✅ Notifications system functions

**Your itinerary management system is now live and ready for users! **