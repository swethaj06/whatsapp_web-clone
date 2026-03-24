@echo off
REM WhatsApp Clone - Vercel Deployment Setup Script for Windows
REM This script helps set up the project for Vercel deployment

echo.
echo 🚀 WhatsApp Clone - Vercel Deployment Setup
echo ===========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed
echo.

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..
echo ✅ Backend dependencies installed
echo.

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..
echo ✅ Frontend dependencies installed
echo.

REM Create environment files
echo 🔐 Setting up environment files...

if not exist "backend\.env" (
    echo Creating backend/.env...
    (
        echo # Server Configuration
        echo PORT=5000
        echo NODE_ENV=development
        echo.
        echo # MongoDB Configuration
        echo MONGODB_URI=mongodb://localhost:27017/whatsapp-clone
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your_jwt_secret_key_here_make_it_strong
        echo JWT_EXPIRE=7d
        echo.
        echo # CORS Settings
        echo CORS_ORIGIN=http://localhost:3000
    ) > backend\.env
    echo ✅ backend\.env created (update with your values)
) else (
    echo ✅ backend\.env already exists
)

if not exist "frontend\.env.local" (
    echo Creating frontend/.env.local...
    (
        echo REACT_APP_API_URL=http://localhost:5000/api
        echo REACT_APP_SOCKET_URL=http://localhost:5000
    ) > frontend\.env.local
    echo ✅ frontend\.env.local created
) else (
    echo ✅ frontend\.env.local already exists
)

echo.
echo 📝 Vercel Deployment Checklist:
echo ================================
echo.
echo 1. Create a GitHub repository:
echo    - Initialize git: git init
echo    - Add remote: git remote add origin https://github.com/yourname/whatsapp_web-clone.git
echo    - Stage files: git add .
echo    - Commit: git commit -m "Initial commit"
echo    - Push: git push -u origin main
echo.
echo 2. Create a Vercel account:
echo    https://vercel.com/signup
echo.
echo 3. Connect GitHub to Vercel:
echo    - Go to https://vercel.com/dashboard
echo    - Click 'Add New Project'
echo    - Import your repository
echo.
echo 4. Set environment variables in Vercel Dashboard:
echo    MONGODB_URI=your_mongodb_atlas_url
echo    JWT_SECRET=your_strong_secret
echo    CORS_ORIGIN=https://whatsappClone.vercel.app
echo.
echo 5. Deploy:
echo    Click 'Deploy' button in Vercel Dashboard
echo.
echo ✅ Setup complete!
echo.
echo For more details, see DEPLOYMENT.md
echo.
pause
