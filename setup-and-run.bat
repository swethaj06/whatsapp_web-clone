@echo off
color 0A
cls

echo ============================================
echo   WhatsApp Clone - Complete Setup
echo ============================================
echo.

REM Check if MongoDB is installed
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: MongoDB is not installed!
    echo.
    echo Please install MongoDB first:
    echo https://www.mongodb.com/try/download/community
    echo.
    pause
    exit /b 1
)

echo [1/3] Starting MongoDB...
REM Check if service exists, if not start mongod
sc query MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    net start MongoDB >nul 2>&1
    echo MongoDB service started
) else (
    echo Note: MongoDB service not found. Make sure mongod is running!
    echo You can start it manually: mongod
)
echo.

echo [2/3] Starting Backend...
start "WhatsApp Backend" cmd /k "cd backend && title WhatsApp Backend && npm start"
timeout /t 3 /nobreak
echo.

echo [3/3] Starting Frontend...
start "WhatsApp Frontend" cmd /k "cd frontend && title WhatsApp Frontend && npm start"
echo.

echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Check Backend Health:
echo http://localhost:5000/api/health
echo.
echo Press any key to exit...
pause >nul
