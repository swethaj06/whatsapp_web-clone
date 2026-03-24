#!/bin/bash

# WhatsApp Clone - Vercel Deployment Setup Script
# This script helps set up the project for Vercel deployment

echo "🚀 WhatsApp Clone - Vercel Deployment Setup"
echo "==========================================="
echo ""

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Git and Node.js are installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm install
cd ../frontend && npm install
cd ..
echo "✅ Dependencies installed"
echo ""

# Create environment files if they don't exist
echo "🔐 Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env..."
    cat > backend/.env << EOF
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/whatsapp-clone

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_make_it_strong
JWT_EXPIRE=7d

# CORS Settings
CORS_ORIGIN=http://localhost:3000
EOF
    echo "✅ backend/.env created (update with your values)"
else
    echo "✅ backend/.env already exists"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "Creating frontend/.env.local..."
    cat > frontend/.env.local << EOF
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
EOF
    echo "✅ frontend/.env.local created"
else
    echo "✅ frontend/.env.local already exists"
fi

echo ""
echo "📝 Vercel Deployment Checklist:"
echo "================================"
echo ""
echo "1. Create a GitHub repository:"
echo "   git init"
echo "   git remote add origin https://github.com/yourname/whatsapp_web-clone.git"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git push -u origin main"
echo ""
echo "2. Create a Vercel account:"
echo "   https://vercel.com/signup"
echo ""
echo "3. Connect GitHub to Vercel:"
echo "   - Go to https://vercel.com/dashboard"
echo "   - Click 'Add New Project'"
echo "   - Import your repository"
echo ""
echo "4. Set environment variables in Vercel Dashboard:"
echo "   MONGODB_URI=your_mongodb_atlas_url"
echo "   JWT_SECRET=your_strong_secret"
echo "   CORS_ORIGIN=https://whatsappClone.vercel.app"
echo ""
echo "5. Deploy:"
echo "   Click 'Deploy' button in Vercel Dashboard"
echo ""
echo "✅ Setup complete!"
echo ""
echo "For more details, see DEPLOYMENT.md"
