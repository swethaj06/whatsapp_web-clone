# Status Not Visible - Troubleshooting Guide

## Problem
Status updates are not showing on the chat interface.

## Root Causes & Solutions

### Cause 1: MongoDB Not Connected ❌

**Symptom:**
- Backend logs show: "⚠️ MongoDB connection error"
- Status upload fails silently
- Browser console shows no status data

**Fix:**
```powershell
# Start MongoDB service
net start MongoDB

# Or start mongod in separate terminal:
mongod
```

Then check:
```powershell
curl http://localhost:5000/api/health
```
Should show: `"database":"connected"`

---

### Cause 2: Backend Not Running ❌

**Symptom:**
- Frontend shows "ERR_CONNECTION_REFUSED"
- Cannot reach http://localhost:5000

**Fix:**
```powershell
cd backend
npm start
```

Wait for: `Server is running on port 5000`

---

### Cause 3: Frontend Not Making Requests ❌

**Symptom:**
- Browser shows no network requests to `/api/status`
- Status section shows "No statuses available"

**Debug:**
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Create a status or refresh page
4. Look for request to `http://localhost:5000/api/status`
5. Check the response

If no request appears:
- Make sure frontend logged in successfully
- Check browser console for errors (F12 > Console)

---

### Cause 4: Authentication Token Missing ❌

**Symptom:**
- API returns 401 Unauthorized
- "Session expired" message

**Fix:**
1. Log out in frontend
2. Log back in
3. Try creating status again

---

### Cause 5: CORS Issue ❌

**Symptom:**
- Browser console shows CORS error
- "Access-Control-Allow-Origin" error

**Fix - Update backend `.env`:**
```
CORS_ORIGIN=http://localhost:3000
```

Then restart backend.

---

## Step-by-Step Verification

### 1. Verify MongoDB
```powershell
# Start MongoDB
mongod

# In another terminal, check connection:
mongo
# Should open MongoDB shell
# Type: exit
```

### 2. Start Backend
```powershell
cd backend
npm start
```

Verify output:
```
Server is running on port 5000
✅ MongoDB connected successfully
```

### 3. Start Frontend
```powershell
cd frontend
npm start
```

Browser should open to http://localhost:3000

### 4. Test Status API

```powershell
# In new terminal, check API (no token needed for testing)
curl http://localhost:5000/api/status

# Should return: [] (empty array initially)
```

### 5. Log In and Create Status

1. Go to http://localhost:3000
2. Click "Sign Up" and create account
3. Fill in profile info
4. Go to Status section
5. Click "+" button to create status
6. Add text/image/video
7. Click send

### 6. Check if Status Saved to Database

```powershell
# In MongoDB shell:
mongo
> use whatsapp_clone
> db.statuses.find()
# Should show your status data
> exit
```

---

## Browser Console Debugging

1. Open http://localhost:3000
2. Press F12 (DevTools)
3. Go to **Console** tab
4. Try creating a status
5. Look for errors in console

Common errors:
- `"Cannot read property 'profilePicture'` → User data not loaded
- `"status is not defined"` → Status API not responding
- `401 Unauthorized` → Need to log in

---

## API Endpoints to Test

### Health Check
```
GET http://localhost:5000/api/health
```

Response:
```json
{
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2026-03-24T12:00:00.000Z"
}
```

### Get All Statuses (requires token)
```
GET http://localhost:5000/api/status
Authorization: Bearer <your-token>
```

Response:
```json
[
  {
    "user": { "_id": "...", "username": "john" },
    "statuses": [
      {
        "_id": "...",
        "userId": "...",
        "content": "Hello!",
        "mediaType": "text",
        "createdAt": "2026-03-24T12:00:00Z"
      }
    ]
  }
]
```

---

## Quick Commands

```powershell
# Start MongoDB
net start MongoDB
# or:
mongod

# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm start

# Or use the automated script:
.\setup-and-run.bat
```

---

## Still Having Issues?

1. **Check backend console for errors** - Look for clear error messages
2. **Check browser console (F12)** - Look for API errors
3. **Check MongoDB is running** - `net start MongoDB` or `mongod`
4. **Restart both servers** - Stop and start fresh
5. **Clear browser cache** - Ctrl+Shift+Delete in browser

---

## Fresh Start

If everything fails, do a complete restart:

```powershell
# 1. Kill all Node processes
taskkill /F /IM node.exe

# 2. Restart MongoDB
net stop MongoDB
net start MongoDB

# 3. Start backend
cd backend
npm start

# 4. In new terminal, start frontend
cd frontend
npm start

# 5. Open http://localhost:3000
```
