#!/bin/bash

# Render Deployment Script for Itinerary Management System
# This script provides instructions and helpers for Render deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

print_header "Render Deployment Guide - Itinerary Management System"

print_info "This script will help you deploy your application to Render.com"

echo ""
print_header "📋 Prerequisites"
echo "1. GitHub account with your code pushed to a repository"
echo "2. Render.com account (free tier available)"
echo "3. MongoDB Atlas account (free tier available)"
echo ""

print_header "🗄️  Step 1: Set up MongoDB Atlas"
echo "1. Go to https://www.mongodb.com/cloud/atlas"
echo "2. Create a free account and cluster"
echo "3. Create a database user with read/write permissions"
echo "4. Whitelist all IP addresses (0.0.0.0/0) for Render"
echo "5. Get your connection string (looks like: mongodb+srv://username:password@cluster.mongodb.net/)"
echo ""

print_header "🔧 Step 2: Deploy Backend to Render"
echo "1. Go to https://render.com and sign up/login"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Configure the web service:"
echo "   - Name: itinerary-backend"
echo "   - Environment: Python 3"
echo "   - Build Command: cd backend && pip install -r requirements.txt"
echo "   - Start Command: cd backend && uvicorn server:app --host 0.0.0.0 --port \$PORT"
echo ""
echo "5. Add Environment Variables:"
echo "   - MONGO_URL: your-mongodb-atlas-connection-string"
echo "   - DB_NAME: itinerary_management"
echo "   - SECRET_KEY: (click 'Generate' for a secure key)"
echo ""
echo "6. Click 'Create Web Service'"
echo ""

print_header "🌐 Step 3: Deploy Frontend to Render (Option A)"
echo "1. In Render dashboard, click 'New +' → 'Static Site'"
echo "2. Connect your GitHub repository"
echo "3. Configure the static site:"
echo "   - Name: itinerary-frontend"
echo "   - Build Command: cd frontend && yarn install && yarn build"
echo "   - Publish Directory: frontend/build"
echo ""
echo "4. Add Environment Variable:"
echo "   - REACT_APP_BACKEND_URL: https://your-backend-service-name.onrender.com"
echo ""
echo "5. Click 'Create Static Site'"
echo ""

print_header "🌐 Alternative: Deploy Frontend to Vercel (Option B)"
echo "If you prefer Vercel for frontend (recommended):"
echo "1. Use the deploy-vercel.sh script after backend is deployed"
echo "2. Run: ./deploy-vercel.sh"
echo "3. Enter your Render backend URL when prompted"
echo ""

print_header "🔍 Step 4: Verify Deployment"
echo "1. Check backend health: https://your-backend-url.onrender.com/api/health"
echo "2. Check frontend: https://your-frontend-url.onrender.com"
echo "3. Test user registration and event creation"
echo ""

print_header "⚙️  Environment Variables Reference"
echo ""
echo "Backend Environment Variables:"
echo "  MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname"
echo "  DB_NAME=itinerary_management"
echo "  SECRET_KEY=your-secure-secret-key-here"
echo ""
echo "Frontend Environment Variables:"
echo "  REACT_APP_BACKEND_URL=https://your-backend-service.onrender.com"
echo ""

print_header "📝 Render Configuration File"
print_info "Your render.yaml file is already configured. You can:"
echo "1. Push it to your repository"
echo "2. In Render, choose 'Deploy from render.yaml' option"
echo "3. This will automatically create both services"
echo ""

print_header "🐛 Troubleshooting"
echo "Common issues and solutions:"
echo ""
echo "1. Backend won't start:"
echo "   - Check that all environment variables are set"
echo "   - Verify MongoDB connection string is correct"
echo "   - Check build logs in Render dashboard"
echo ""
echo "2. Frontend can't connect to backend:"
echo "   - Verify REACT_APP_BACKEND_URL is correct"
echo "   - Ensure backend URL includes https://"
echo "   - Check CORS settings in backend"
echo ""
echo "3. Database connection issues:"
echo "   - Verify MongoDB Atlas is running"
echo "   - Check IP whitelist includes 0.0.0.0/0"
echo "   - Verify database user has correct permissions"
echo ""

print_header "🎯 Production Optimizations"
echo "For production use, consider:"
echo "1. Setting up custom domains"
echo "2. Enabling SSL certificates"
echo "3. Setting up monitoring and alerts"
echo "4. Configuring backup strategies"
echo "5. Implementing rate limiting"
echo ""

print_header "🔗 Useful Links"
echo "- Render Documentation: https://render.com/docs"
echo "- MongoDB Atlas: https://www.mongodb.com/cloud/atlas"
echo "- Vercel Documentation: https://vercel.com/docs"
echo ""

print_status "Deployment guide completed!"
print_info "Follow the steps above to deploy your application to Render."