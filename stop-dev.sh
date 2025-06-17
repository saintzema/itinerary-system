#!/bin/bash
# Development stop script

echo "🛑 Stopping all development services..."

# Stop backend processes
pkill -f "uvicorn server:app"

# Stop frontend processes  
pkill -f "react-scripts start"

# Stop yarn processes
pkill -f "yarn start"

echo "✅ All services stopped"
