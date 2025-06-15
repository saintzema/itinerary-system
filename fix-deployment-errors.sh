#!/bin/bash

# Complete Deployment Error Fix Script
# This script fixes both Render backend and Vercel frontend deployment issues

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

print_header "Deployment Error Fixes - Render & Vercel"

echo -e "${YELLOW}I've identified both deployment issues and created fixes:${NC}"
echo ""
echo -e "${RED}1. Render Backend Error:${NC} nginx configuration conflict"
echo -e "${RED}2. Vercel Frontend Error:${NC} functions pattern mismatch"
echo ""

print_header "🔧 Render Backend Fix"
echo ""
echo -e "${YELLOW}Your Render backend is failing because it's trying to use nginx${NC}"
echo -e "${YELLOW}configuration meant for Docker. Render doesn't need nginx.${NC}"
echo ""
echo -e "${GREEN}✅ SOLUTION: Use simple uvicorn start command${NC}"
echo ""
echo "1. Go to render.com and delete your current backend service"
echo "2. Create a new Web Service with these EXACT settings:"
echo ""
echo -e "${BLUE}Build Command:${NC}"
echo "cd backend && pip install --upgrade pip && pip install -r requirements.txt"
echo ""
echo -e "${BLUE}Start Command:${NC}"
echo "cd backend && uvicorn server:app --host 0.0.0.0 --port \$PORT --workers 1"
echo ""
echo -e "${BLUE}Environment Variables:${NC}"
echo "MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/"
echo "DB_NAME=itinerary_management"
echo "SECRET_KEY=(click Generate)"
echo "DEBUG=false"
echo ""

print_header "🌐 Vercel Frontend Fix"
echo ""
echo -e "${YELLOW}Your Vercel frontend is failing because of functions pattern${NC}"
echo -e "${YELLOW}in vercel.json that doesn't match your project structure.${NC}"
echo ""
echo -e "${GREEN}✅ SOLUTION: Set Root Directory to 'frontend'${NC}"
echo ""
echo "Choose one of these methods:"
echo ""
echo -e "${BLUE}Method A: Fix Current Project${NC}"
echo "1. Go to vercel.com → Your Project → Settings → General"
echo "2. Change 'Root Directory' from './' to 'frontend'"
echo "3. Add Environment Variables:"
echo "   - REACT_APP_BACKEND_URL: your-render-backend-url"
echo "   - GENERATE_SOURCEMAP: false"
echo "4. Go to Deployments → Redeploy"
echo ""
echo -e "${BLUE}Method B: Delete & Recreate${NC}"
echo "1. Delete current Vercel project"
echo "2. Create new project from GitHub"
echo "3. Set Root Directory to 'frontend'"
echo "4. Add environment variables"
echo "5. Deploy"
echo ""

print_header "📋 Step-by-Step Action Plan"

echo ""
echo "Please follow these steps in order:"
echo ""
echo -e "${YELLOW}STEP 1: Fix Render Backend${NC}"
echo "1. Go to render.com/dashboard"
echo "2. Delete current backend service (if it exists)"
echo "3. Create new Web Service"
echo "4. Use the exact commands shown above"
echo "5. Add environment variables"
echo "6. Deploy and note the URL"
echo ""
echo -e "${YELLOW}STEP 2: Fix Vercel Frontend${NC}"
echo "1. Choose Method A or B above"
echo "2. Use your Render backend URL as REACT_APP_BACKEND_URL"
echo "3. Deploy"
echo ""
echo -e "${YELLOW}STEP 3: Test${NC}"
echo "1. Visit your frontend URL"
echo "2. Test registration and login"
echo "3. Create an event"
echo "4. Check calendar view"
echo ""

print_header "🎯 Exact Configuration References"

echo ""
echo -e "${GREEN}For Render Backend:${NC}"
echo "- See: RENDER_BACKEND_FIX.md"
echo "- Build: cd backend && pip install --upgrade pip && pip install -r requirements.txt"
echo "- Start: cd backend && uvicorn server:app --host 0.0.0.0 --port \$PORT --workers 1"
echo ""
echo -e "${GREEN}For Vercel Frontend:${NC}"
echo "- See: VERCEL_FRONTEND_FIX.md"
echo "- Root Directory: frontend"
echo "- Framework: Create React App"
echo "- Environment: REACT_APP_BACKEND_URL"
echo ""

print_header "🆘 Alternative Solutions"

echo ""
echo -e "${BLUE}If Render continues to fail:${NC}"
echo "- Try Railway.app (simpler deployment)"
echo "- Use local MongoDB instead of Atlas"
echo "- Check MongoDB Atlas whitelist (0.0.0.0/0)"
echo ""
echo -e "${BLUE}If Vercel continues to fail:${NC}"
echo "- Try Netlify.com (same features)"
echo "- Use Vercel CLI from frontend directory"
echo "- Deploy frontend as static site"
echo ""

print_header "📞 Quick Help"

echo ""
echo "Documentation files created:"
echo "- RENDER_BACKEND_FIX.md - Complete Render backend solution"
echo "- VERCEL_FRONTEND_FIX.md - Complete Vercel frontend solution"
echo "- render-backend.yaml - Render configuration file"
echo ""
echo "Test locally first:"
echo "- ./deploy-local.sh"
echo ""

print_status "Both deployment issues now have complete solutions!"
print_info "Follow the step-by-step plan above and you'll be live in 10 minutes! 🚀"