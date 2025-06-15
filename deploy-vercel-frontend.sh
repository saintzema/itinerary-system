#!/bin/bash

# Vercel Frontend-Only Deployment Script
# This script deploys ONLY the frontend to Vercel

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

# Check if running in project directory
if [[ ! -f "README.md" ]] || [[ ! -d "frontend" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_header "Vercel Frontend Deployment - Itinerary Management System"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_info "Please login to Vercel"
    vercel login
fi

# Read backend URL from user
echo ""
print_info "Backend URL Configuration"
echo "Enter your backend URL (e.g., https://your-app.onrender.com):"
read -r BACKEND_URL

if [[ -z "$BACKEND_URL" ]]; then
    print_error "Backend URL is required"
    exit 1
fi

print_info "Using backend URL: $BACKEND_URL"

# Navigate to frontend directory
cd frontend

# Update environment variables
print_info "Updating frontend environment variables..."

# Create/update .env.production
cat > .env.production << EOF
REACT_APP_BACKEND_URL=$BACKEND_URL
GENERATE_SOURCEMAP=false
EOF

# Update vercel.json with the actual backend URL
sed -i.bak "s|https://your-backend-domain.onrender.com|$BACKEND_URL|g" vercel.json

# Install dependencies and build
print_info "Installing dependencies and building..."
yarn install
yarn build

if [ $? -ne 0 ]; then
    print_error "Frontend build failed. Please fix the errors and try again."
    exit 1
fi

print_status "Frontend build successful"

# Deploy to Vercel
print_header "Deploying Frontend to Vercel"

# Set environment variables in Vercel
print_info "Setting environment variables..."
vercel env add REACT_APP_BACKEND_URL production <<< "$BACKEND_URL"
vercel env add GENERATE_SOURCEMAP production <<< "false"

# Deploy
print_info "Starting deployment..."
vercel --prod

if [ $? -eq 0 ]; then
    print_status "Deployment successful!"
    
    # Get deployment URL
    DEPLOYMENT_URL=$(vercel ls | head -2 | tail -1 | awk '{print $2}' 2>/dev/null || echo "your-app-url")
    
    echo ""
    print_header "🎉 Frontend Deployment Complete!"
    echo -e "${GREEN}"
    echo "✅ Frontend deployed to Vercel successfully!"
    echo ""
    echo "🌐 Your application URLs:"
    echo "   Frontend: https://$DEPLOYMENT_URL"
    echo "   Backend:  $BACKEND_URL"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Test your application at the frontend URL"
    echo "   2. Verify backend connectivity"
    echo "   3. Test user registration and event creation"
    echo ""
    echo "🔧 Useful commands:"
    echo "   View deployments: vercel ls"
    echo "   View logs:        vercel logs"
    echo "   Set custom domain: vercel domains add yourdomain.com"
    echo -e "${NC}"
else
    print_error "Deployment failed"
    # Restore original vercel.json
    mv vercel.json.bak vercel.json 2>/dev/null || true
    exit 1
fi

# Restore original vercel.json
mv vercel.json.bak vercel.json 2>/dev/null || true

cd ..
print_status "Frontend deployment script completed"