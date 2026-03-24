#!/bin/bash

echo "Starting WhatsApp Clone Servers..."
echo ""

# Start backend in background
echo "Starting Backend on port 5000..."
cd backend
npm start &
BACKEND_PID=$!

# Wait 3 seconds
sleep 3

# Start frontend in background
echo "Starting Frontend on port 3000..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "Both servers are starting..."
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop servers, press Ctrl+C or run:"
echo "kill $BACKEND_PID $FRONTEND_PID"
