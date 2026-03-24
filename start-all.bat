@echo off
echo Starting WhatsApp Clone Servers...
echo.

REM Start backend in a new window
echo Starting Backend on port 5000...
start "WhatsApp Backend" cmd /k "cd backend && npm start"

REM Wait 3 seconds then start frontend
timeout /t 3 /nobreak

echo Starting Frontend on port 3000...
start "WhatsApp Frontend" cmd /k "cd frontend && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause
