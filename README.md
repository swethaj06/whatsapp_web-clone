# WhatsApp Web Clone

A full-stack WhatsApp web application clone built with React, Node.js, Express, and MongoDB. This project includes real-time messaging, status updates, group support, and voice/video calling capabilities.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Setup Instructions](#setup-instructions)
- [Running the Project](#running-the-project)
- [Environment Variables](#environment-variables)
- [Technology Stack](#technology-stack)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Features

✨ **Core Features:**
- User authentication (Sign up & Login)
- Real-time messaging with WebSocket
- Status updates (Text, Image, Video)
- Group chat support
- Contact management
- User profile with avatar
- Online/Offline status
- Message search functionality
- Favorites management
- Voice and video calling
- Activity logging

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14+ recommended): [Download](https://nodejs.org/)
- **MongoDB** (Local or MongoDB Atlas): [Download](https://www.mongodb.com/try/download/community) or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Git**: [Download](https://git-scm.com/)
- **npm** or **yarn** package manager

## Project Structure

```
whatsapp_web-clone/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Custom middleware
│   │   ├── models/            # MongoDB models
│   │   ├── routes/            # API routes
│   │   └── server.js          # Express app entry
│   ├── package.json
│   ├── .env.example
│   └── uploads/               # Upload directory
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── contexts/          # React contexts
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── build/                 # Production build
└── README.md
```

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/whatsapp_web-clone.git
cd whatsapp_web-clone
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Setup Instructions

### Backend Setup

#### 1. Create Environment File

Navigate to the backend folder and create a `.env` file:

```bash
cd backend
cp .env.example .env
```

#### 2. Configure Environment Variables

Edit `.env` with the following template:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/whatsapp-clone
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-clone?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_make_it_strong
JWT_EXPIRE=7d

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_DIR=./uploads

# CORS Settings
CORS_ORIGIN=http://localhost:3000
```

#### 3. Database Setup (MongoDB)

**Option A: Local MongoDB**
- Install MongoDB Community Edition
- Start MongoDB service
- MongoDB will be available at `mongodb://localhost:27017`

**Option B: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster
4. Get connection string and add to `.env`

### Frontend Setup

#### 1. Create Environment File

```bash
cd frontend
cp .env.example .env.local
```

#### 2. Configure Frontend Environment

Create `.env.local` in the frontend folder:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Running the Project

### Option 1: Run Backend and Frontend Separately

#### Terminal 1 - Start Backend Server

```bash
cd backend
npm start
```

The backend will run on `http://localhost:5000`

#### Terminal 2 - Start Frontend Development Server

```bash
cd frontend
npm start
```

The frontend will open on `http://localhost:3000`

### Option 2: Run Both Concurrently (from root directory)

If you have concurrently installed globally:

```bash
npm install -g concurrently

# From root directory
concurrently "cd backend && npm start" "cd frontend && npm start"
```

### Building for Production

#### Build Frontend

```bash
cd frontend
npm run build
```

The optimized build will be created in the `frontend/build` folder.

#### Build Backend

No build needed for backend (if using Node.js directly). For production, consider using PM2:

```bash
npm install -g pm2
pm2 start backend/src/server.js --name "whatsapp-backend"
pm2 save
```

## Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/whatsapp-clone` |
| `JWT_SECRET` | Secret key for JWT tokens | `your_secret_key_here` |
| `JWT_EXPIRE` | JWT token expiration | `7d` |
| `MAX_FILE_SIZE` | Max upload file size | `50MB` |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:3000` |

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000` |
| `REACT_APP_SOCKET_URL` | WebSocket server URL | `http://localhost:5000` |

## Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router v6** - Routing
- **Socket.io Client** - Real-time communication
- **React Hot Toast** - Notifications
- **React Icons** - Icon library
- **CSS3** - Styling with custom properties

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Socket.io** - Real-time events
- **JWT** - Authentication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/search` - Search users

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/:chatId` - Get chat messages
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### Groups
- `POST /api/groups` - Create group
- `GET /api/groups` - Get user's groups
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Status
- `POST /api/status` - Create status
- `GET /api/status` - Get all statuses
- `DELETE /api/status/:id` - Delete status

## Deployment

### Deploy on Vercel

This project is configured for easy deployment on Vercel. Follow these steps:

#### Prerequisites
- Vercel account ([Create here](https://vercel.com/signup))
- GitHub account with the repository pushed
- MongoDB Atlas account for cloud database

#### Step 1: Push to GitHub

```bash
git remote add origin https://github.com/yourusername/whatsapp_web-clone.git
git push -u origin main
```

#### Step 2: Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Select **Import Git Repository**
4. Select your `whatsapp_web-clone` repository
5. Project name will auto-populate as `whatsapp_web_clone`
6. Click **Import**

#### Step 3: Configure Environment Variables

After importing, you'll be prompted to add environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-clone?retryWrites=true&w=majority
JWT_SECRET=your_strong_jwt_secret_key_here
CORS_ORIGIN=https://whatsappClone.vercel.app
```

**Note:** Update `CORS_ORIGIN` after deployment with your actual Vercel URL

#### Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete
3. Your project will be live at `https://whatsappClone.vercel.app`

#### Step 5: Update Frontend Configuration

After deployment, update your frontend API URL:

```javascript
// In frontend/.env.local
REACT_APP_API_URL=https://whatsappClone.vercel.app/api
REACT_APP_SOCKET_URL=https://whatsappClone.vercel.app
```

Then redeploy:

```bash
git push origin main
```

#### Manual Deployment with Vercel CLI

Alternatively, deploy using Vercel CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from root directory
vercel --prod
```

#### Important Notes

⚠️ **Production Checklist:**
- [ ] MongoDB Atlas cluster is created and accessible
- [ ] Environment variables are set in Vercel dashboard
- [ ] CORS_ORIGIN is updated to match Vercel URL
- [ ] Firebase/Cloud Storage (if using) is configured
- [ ] JWT_SECRET is strong and unique
- [ ] Frontend API endpoints point to production backend
- [ ] WebSocket connections use production URL

#### Monitoring Deployment

1. View deployment logs:
   - Go to Vercel Dashboard → Project → Deployments
   - Click the deployment to see logs

2. Check API connection:
   - Visit `https://whatsappClone.vercel.app/api/health`
   - Should return: `{"message":"Server is running"}`

3. Debug WebSocket issues:
   - Check browser console for connection errors
   - Verify CORS_ORIGIN matches frontend URL
   - Check MongoDB connection status

#### Troubleshooting Deployment

**Build Failed Error:**
- Check backend dependencies in `backend/package.json`
- Ensure `vercel.json` is in root directory
- Verify all environment variables are set

**WebSocket Connection Failed:**
- Update `CORS_ORIGIN` in environment variables
- Redeploy after updating
- Check Socket.IO configuration in backend

**Database Connection Error:**
- Verify MongoDB Atlas IP whitelist includes Vercel
- Check `MONGODB_URI` is correct
- Ensure database user has proper permissions

#### Scaling & Performance

- Vercel auto-scales with traffic
- Monitor usage in Vercel Dashboard → Usage
- Upgrade plan if needed for higher limits
- Use Vercel Analytics for performance monitoring

## Troubleshooting

### Backend won't start

**Error: `Port 5000 already in use`**
```bash
# Kill process on port 5000
# On Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# On macOS/Linux:
lsof -ti:5000 | xargs kill -9
```

**Error: `Cannot connect to MongoDB`**
- Check if MongoDB service is running
- Verify MongoDB URI in `.env`
- For MongoDB Atlas, ensure IP is whitelisted

### Frontend won't start

**Error: `Port 3000 already in use`**
```bash
# Set a different port
PORT=3001 npm start
```

**Error: `API endpoint not found`**
- Verify backend is running on port 5000
- Check `REACT_APP_API_URL` in `.env.local`
- Verify backend routes are correct

### WebSocket connection failed

- Ensure backend is running on correct port
- Check `REACT_APP_SOCKET_URL` matches backend URL
- Verify CORS settings in backend

## Development Tips

### Enable Hot Reload

Both frontend and backend support hot reload:
- **Frontend**: Changes auto-reload the browser
- **Backend**: Install `nodemon` for auto-restart

```bash
cd backend
npm install --save-dev nodemon
```

Update `package.json` scripts:
```json
"scripts": {
  "start": "nodemon src/server.js"
}
```

### Database Management

Using MongoDB Compass for visual management:
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to your MongoDB instance
3. Browse collections and documents

### Testing the API

Use Postman or API testing tools:
1. Download [Postman](https://www.postman.com/downloads/)
2. Import API collection (if available)
3. Test endpoints with different scenarios



### Version 1.0.0 (Initial Release)
- User authentication
- Real-time messaging
- Status updates
- Group chat
- Voice/video calling
- Message search
- Responsive design

---
