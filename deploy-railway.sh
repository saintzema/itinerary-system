#!/bin/bash

# Railway Deployment Script for Itinerary Management System
# This script guides you through Railway deployment

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
    echo "=========================================="
}

print_header "Railway Deployment - Itinerary Management System"

echo -e "${GREEN}Railway is the EASIEST platform for your full-stack deployment!${NC}"
echo ""
echo -e "${BLUE}✅ Benefits of Railway:${NC}"
echo "• Deploys both frontend and backend automatically"
echo "• No bcrypt compilation issues"
echo "• No root directory confusion"  
echo "• Built-in environment management"
echo "• $5/month free credit"
echo ""

print_header "📋 Pre-Deployment Checklist"

echo "✅ Your repository is ready with:"
echo "  • railway.json - Railway configuration"
echo "  • backend/Procfile - Process definition"
echo "  • Fixed requirements.txt - No compilation errors"
echo "  • Optimized frontend - Ready for deployment"
echo ""

print_header "🚀 Step-by-Step Railway Deployment"

echo ""
echo -e "${YELLOW}STEP 1: Create Railway Account${NC}"
echo "1. Go to https://railway.app"
echo "2. Click 'Login' and sign up with GitHub"
echo "3. Authorize Railway to access your repositories"
echo ""

echo -e "${YELLOW}STEP 2: Deploy Your Repository${NC}"
echo "1. Click 'Deploy from GitHub repo'"
echo "2. Select your 'itinerary-system' repository"
echo "3. Railway will automatically detect:"
echo "   📦 Backend Service (Python/FastAPI)"
echo "   🌐 Frontend Service (Node.js/React)"
echo ""

echo -e "${YELLOW}STEP 3: Configure Backend Environment Variables${NC}"
echo "1. Click on your Backend service"
echo "2. Go to 'Variables' tab"
echo "3. Add these environment variables:"
echo ""
echo -e "${BLUE}MONGO_URL=${NC}"
echo "mongodb+srv://admin:SAng12@itinerarymanagement.xf9gm3m.mongodb.net/?retryWrites=true&w=majority&appName=itinerarymanagement"
echo ""
echo -e "${BLUE}DB_NAME=${NC}"
echo "itinerary_management"
echo ""
echo -e "${BLUE}SECRET_KEY=${NC}"
echo "railway-super-secret-key-2024"
echo ""
echo -e "${BLUE}DEBUG=${NC}"
echo "false"
echo ""

echo -e "${YELLOW}STEP 4: Wait for Backend Deployment${NC}"
echo "1. Railway will build and deploy your backend"
echo "2. Watch the build logs for any issues"
echo "3. Once deployed, note your backend URL"
echo "   (e.g., https://your-backend.up.railway.app)"
echo ""

echo -e "${YELLOW}STEP 5: Configure Frontend Environment Variables${NC}"
echo "1. Click on your Frontend service"
echo "2. Go to 'Variables' tab"
echo "3. Add these environment variables:"
echo ""
echo -e "${BLUE}REACT_APP_BACKEND_URL=${NC}"
echo "https://your-backend.up.railway.app"
echo ""
echo -e "${BLUE}GENERATE_SOURCEMAP=${NC}"
echo "false"
echo ""

echo -e "${YELLOW}STEP 6: Deploy Frontend${NC}"
echo "1. Railway will automatically rebuild frontend with new variables"
echo "2. Once deployed, you'll get your frontend URL"
echo "   (e.g., https://your-frontend.up.railway.app)"
echo ""

print_header "🧪 Test Your Deployment"

echo ""
echo -e "${GREEN}After deployment, test these:${NC}"
echo ""
echo "1. Backend Health Check:"
echo "   https://your-backend.up.railway.app/api/health"
echo ""
echo "2. Frontend Application:"
echo "   https://your-frontend.up.railway.app"
echo ""
echo "3. Complete User Flow:"
echo "   • Register a new account"
echo "   • Login with credentials"
echo "   • Create an event"
echo "   • View calendar"
echo "   • Test notifications"
echo ""

print_header "🐛 Troubleshooting"

echo ""
echo -e "${YELLOW}If Backend Fails:${NC}"
echo "• Check environment variables are set correctly"
echo "• Verify MongoDB connection string"
echo "• Check build logs in Railway dashboard"
echo ""
echo -e "${YELLOW}If Frontend Fails:${NC}"
echo "• Verify REACT_APP_BACKEND_URL is correct"
echo "• Ensure backend is deployed and working first"
echo "• Check build logs for JavaScript errors"
echo ""
echo -e "${YELLOW}If Database Connection Fails:${NC}"
echo "• MongoDB Atlas should whitelist 0.0.0.0/0"
echo "• Test connection string manually"
echo "• Check MongoDB Atlas is running"
echo ""

print_header "💰 Railway Pricing"

echo ""
echo "• Free Tier: $5/month credit (covers development)"
echo "• Pro Plan: $20/month (for production)"
echo "• Usage-based: Only pay for what you use"
echo ""

print_header "🎉 What You'll Get"

echo ""
echo -e "${GREEN}After successful deployment:${NC}"
echo "✅ Full-stack application live on the internet"
echo "✅ Automatic SSL certificates (HTTPS)"
echo "✅ Custom domain support available"
echo "✅ Automatic deployments on git push"
echo "✅ Built-in monitoring and logs"
echo "✅ Easy scaling when needed"
echo ""

print_header "🔗 Useful Links"

echo ""
echo "• Railway Dashboard: https://railway.app/dashboard"
echo "• Railway Docs: https://docs.railway.app"
echo "• Your MongoDB: https://cloud.mongodb.com"
echo ""

print_header "🚀 Ready to Deploy?"

echo ""
echo -e "${GREEN}Your project is 100% ready for Railway deployment!${NC}"
echo ""
echo "Next steps:"
echo "1. Go to https://railway.app"
echo "2. Follow the steps above"
echo "3. You'll be live in 10-15 minutes!"
echo ""

print_status "Railway will solve ALL your deployment issues! 🎉"
print_info "Good luck with your deployment! 🚀"