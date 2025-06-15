#!/bin/bash

# Quick Fix for Vercel Deployment Issues
# This script provides multiple solutions for the Vercel deployment error

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

print_header "Vercel Deployment Fix - Itinerary Management System"

echo -e "${YELLOW}You got the Vercel error because it's trying to build from root directory${NC}"
echo -e "${YELLOW}but your frontend is in a subdirectory. Here are 4 solutions:${NC}"
echo ""

print_header "Solution 1: Use Frontend-Only Deployment Script (Recommended)"
echo ""
echo "This script deploys only the frontend directory to Vercel:"
echo ""
echo -e "${GREEN}# 1. First deploy backend to Render manually${NC}"
echo -e "${GREEN}# 2. Then run:${NC}"
echo -e "${BLUE}chmod +x deploy-vercel-frontend.sh${NC}"
echo -e "${BLUE}./deploy-vercel-frontend.sh${NC}"
echo ""

print_header "Solution 2: Manual Vercel Dashboard Deployment"
echo ""
echo "1. Go to vercel.com"
echo "2. Click 'New Project'"
echo "3. Import your GitHub repository"
echo "4. ⚠️  IMPORTANT: Change 'Root Directory' to 'frontend'"
echo "5. Set environment variables:"
echo "   - REACT_APP_BACKEND_URL: your-backend-url"
echo "   - GENERATE_SOURCEMAP: false"
echo "6. Deploy"
echo ""

print_header "Solution 3: Alternative Platforms"
echo ""
echo "If Vercel continues to have issues:"
echo ""
echo "A) Netlify (Great Vercel alternative):"
echo "   - Base directory: frontend"
echo "   - Build command: yarn build"
echo "   - Publish directory: frontend/build"
echo ""
echo "B) Railway (Full stack in one place):"
echo "   - Deploys both frontend and backend automatically"
echo "   - Just connect GitHub repository"
echo ""

print_header "Solution 4: Fix Current Vercel Setup"
echo ""
echo "If you want to keep using your current Vercel project:"
echo ""

# Ask user which solution they want
echo ""
echo -e "${YELLOW}Which solution would you like to try?${NC}"
echo "1) Use frontend-only deployment script (Recommended)"
echo "2) Get manual deployment instructions"
echo "3) Fix current Vercel project settings"
echo "4) Test locally first"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        print_header "Frontend-Only Deployment"
        echo ""
        print_info "This will deploy only the frontend to Vercel."
        echo ""
        echo "First, you need to deploy the backend to Render:"
        echo "1. Go to render.com"
        echo "2. Connect your GitHub repository"
        echo "3. Create Web Service with:"
        echo "   Build Command: cd backend && pip install -r requirements.txt"
        echo "   Start Command: cd backend && uvicorn server:app --host 0.0.0.0 --port \$PORT"
        echo ""
        echo "4. Add environment variables:"
        echo "   MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/"
        echo "   DB_NAME=itinerary_management"
        echo "   SECRET_KEY=(click Generate)"
        echo ""
        echo "After backend is deployed, run:"
        echo -e "${BLUE}./deploy-vercel-frontend.sh${NC}"
        echo ""
        print_warning "Make sure you have your backend URL ready!"
        ;;
    2)
        print_header "Manual Deployment Instructions"
        echo ""
        echo "For Vercel Dashboard:"
        echo "1. Delete your current Vercel project (if it exists)"
        echo "2. Go to vercel.com → New Project"
        echo "3. Import your GitHub repository"
        echo "4. ⚠️  CRITICAL: In 'Configure Project':"
        echo "   - Change 'Root Directory' from './' to 'frontend'"
        echo "   - Framework Preset: Create React App"
        echo "   - Build Command: yarn build"
        echo "   - Output Directory: build"
        echo "5. Add Environment Variables:"
        echo "   - REACT_APP_BACKEND_URL: https://your-backend.onrender.com"
        echo "   - GENERATE_SOURCEMAP: false"
        echo "6. Deploy"
        echo ""
        print_status "This should work perfectly!"
        ;;
    3)
        print_header "Fix Current Vercel Project"
        echo ""
        echo "To fix your existing Vercel project:"
        echo "1. Go to your Vercel dashboard"
        echo "2. Select your project"
        echo "3. Go to Settings → General"
        echo "4. Change 'Root Directory' from './' to 'frontend'"
        echo "5. Go to Settings → Environment Variables"
        echo "6. Add:"
        echo "   - REACT_APP_BACKEND_URL: your-backend-url"
        echo "   - GENERATE_SOURCEMAP: false"
        echo "7. Go to Deployments tab"
        echo "8. Click 'Redeploy' on the latest deployment"
        echo ""
        print_warning "Make sure your backend is deployed first!"
        ;;
    4)
        print_header "Test Locally First"
        echo ""
        print_info "Good idea! Let's make sure everything works locally first."
        echo ""
        if [[ -f "deploy-local.sh" ]]; then
            echo "Running local deployment..."
            ./deploy-local.sh
        else
            echo "Local deployment script not found. Running manual setup..."
            print_info "Setting up backend..."
            cd backend
            if [[ ! -d "venv" ]]; then
                python3 -m venv venv
            fi
            source venv/bin/activate
            pip install -r requirements.txt
            cd ..
            
            print_info "Setting up frontend..."
            cd frontend
            yarn install
            cd ..
            
            print_status "Setup complete! Now start the services:"
            echo "1. Start backend: cd backend && source venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
            echo "2. Start frontend: cd frontend && yarn start"
        fi
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_header "🎯 Recommended Deployment Strategy"
echo ""
echo -e "${GREEN}For the easiest deployment:${NC}"
echo "1. 🔧 Backend → Render.com (excellent for Python/FastAPI)"
echo "2. 🌐 Frontend → Vercel.com (excellent for React)"
echo ""
echo -e "${GREEN}This combination gives you:${NC}"
echo "✅ Free tiers for both platforms"
echo "✅ Automatic deployments on git push"
echo "✅ Excellent performance and reliability"
echo "✅ Easy SSL/HTTPS setup"
echo ""

print_header "🆘 Need More Help?"
echo ""
echo "📖 Check DEPLOYMENT_QUICK_FIX.md for detailed instructions"
echo "📖 Check README.md for comprehensive deployment guide"
echo "🐛 Test locally first with: ./deploy-local.sh"
echo ""

print_status "Your app is production-ready - just need the right deployment approach! 🎉"