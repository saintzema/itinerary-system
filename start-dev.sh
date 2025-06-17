#!/bin/bash
# Development start script

echo "🚀 Starting Itinerary Management System in development mode..."

# Start backend in background
echo "Starting backend..."
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
yarn start &
FRONTEND_PID=$!

cd ..

echo "✅ Services started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Application URLs:"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8001"
echo "API Docs: http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
