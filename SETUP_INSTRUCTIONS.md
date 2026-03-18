# WhatsApp Clone - Setup Instructions

## Error: "Unexpected token '<', "<! DOCTYPE ..." is not valid JSON"

This error means the backend server is not running or not responding correctly.

## Solution Steps:

### 1. Start MongoDB
Make sure MongoDB is running locally:
```bash
# Windows (if MongoDB is installed as service)
net start mongod

# Or run directly
mongod
```

### 2. Start Backend Server
```bash
cd backend
npm install  # if not already installed
npm start    # or: node src/server.js
```

You should see output like:
```
Server is running on port 5000
MongoDB connected successfully
```

### 3. Start Frontend
In another terminal:
```bash
cd frontend
npm start
```

Frontend will open at `http://localhost:3000`

## Testing OTP Flow:

1. Click "Log in with phone number"
2. Enter phone number: `+1234567890` (or any 10+ digit number)
3. Click "Send OTP"
4. Check browser console (F12 → Console tab) for the demo OTP
5. Enter that OTP in the verification screen
6. You should be logged in and redirected to chat

## Troubleshooting:

- **Error: Cannot reach localhost:5000** 
  - Make sure backend server is running
  - Check if port 5000 is available

- **MongoDB connection error**
  - Make sure MongoDB is running
  - Check MongoDB URI in .env file

- **OTP not showing in console**
  - Open Developer Tools (F12)
  - Go to Console tab
  - Look for "Demo OTP for testing: xxxxxx"

## Environment Variables Required:

Create/Update `.env` in backend folder:
```
MONGODB_URI=mongodb://localhost:27017/whatsapp_clone
JWT_SECRET=your_secret_key
PORT=5000
```

## Frontend Environment:

Create `.env` in frontend folder (optional):
```
REACT_APP_API_URL=http://localhost:5000/api
```

## For Real WhatsApp OTP Integration:

Install Twilio:
```bash
cd backend
npm install twilio
```

Add to `.env`:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

Then uncomment the Twilio code in `backend/src/controllers/userController.js` sendOtp function.
