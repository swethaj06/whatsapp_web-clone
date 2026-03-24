# WhatsApp Clone - Getting Started Guide

## Current Status
✅ Backend server is running on port 5000 (without MongoDB)
⚠️ MongoDB is not connected - features requiring database will not work

## To Get Full Functionality

You need to set up MongoDB. Choose one option:

### Option 1: MongoDB Atlas (Recommended - Cloud DB)
Best for testing and deployment.

1. **Create Free Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up with email or Google

2. **Create a Cluster**
   - Click "Create" or "Build a Database"
   - Select "Free" tier
   - Choose AWS region closest to you
   - Click "Create Cluster" (takes ~3 minutes)

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Username: `whatsapp_user`
   - Password: (generate secure password)
   - Click "Add User"

4. **Get Connection String**
   - Go to "Database" or "Clusters"
   - Click "Connect" on your cluster
   - Select "Drivers" / "Node.js"
   - Copy the connection string
   - Replace `<password>` with your user password
   - Replace `myFirstDatabase` with `whatsapp_clone`

5. **Update .env File**
   - Open `backend/.env`
   - Replace the MONGODB_URI with your Atlas connection string:
   ```
   MONGODB_URI=mongodb+srv://whatsapp_user:yourpassword@cluster0.xxxxx.mongodb.net/whatsapp_clone
   ```

6. **Restart Backend**
   - Stop backend (Ctrl+C)
   - Run `npm start` again in backend folder

### Option 2: MongoDB Local (Requires Installation)

1. **Download & Install**
   - Go to https://www.mongodb.com/try/download/community
   - Download for Windows
   - Run installer (choose default options)

2. **Start MongoDB**
   ```powershell
   mongod
   ```
   Keep this window open

3. **Run Backend**
   ```powershell
   cd backend
   npm start
   ```

## Running the Application

### Method 1: Using Startup Script (Easiest)
```powershell
# From the root directory
.\start-all.bat
```
This opens two terminal windows - one for backend, one for frontend.

### Method 2: Manual Start

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm start
```

Then open http://localhost:3000 in your browser.

## After Starting

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Backend Health: http://localhost:5000/api/health

## Troubleshooting

**"MongoDB connection error"**
- This is expected if you haven't set up MongoDB yet
- Backend still runs - but signup/login/messages won't work
- Follow one of the setup options above

**Port already in use (Port 5000 or 3000)**
```powershell
# Find what's using the port
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number)
taskkill /PID 12345 /F
```

**Dependencies missing**
```powershell
# In backend folder:
npm install

# In frontend folder:
npm install
```

## Environment Variables

Backend `.env` file:
- `PORT`: 5000 (default)
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret for authentication
- `NODE_ENV`: production or development
- `CORS_ORIGIN`: Frontend URL

## Next Steps

1. Set up MongoDB (Option 1 or 2 above)
2. Update `.env` with MongoDB connection string
3. Restart backend
4. Open http://localhost:3000
5. Create account and start chatting!

## Deployment

When ready to deploy to Vercel:
- Ensure MongoDB Atlas is set up (won't work with local MongoDB)
- Push code to GitHub
- Import project in Vercel
- Set environment variables in Vercel dashboard
- Deploy!
