# WhatsApp Web Clone - MERN Stack Project

A full-stack chat application built with MongoDB, Express, React, and Node.js, featuring real-time messaging with Socket.IO.

## ✨ Features

### User Management
- User registration and authentication with JWT
- Secure password hashing with bcrypt
- User profile management
- Support for multiple users

### Chat Interface
- **Two-panel WhatsApp-like layout**
  - Left panel: Chat list with all available users
  - Right panel: Active chat window with message history
- **Active chat highlighting**
- **User avatars with initials**
- **Message display with timestamps**
- **Visual distinction between sent and received messages**
- **Auto-scroll to latest message**

### Real-Time Messaging
- **Instant message delivery** using Socket.IO
- **Live message updates** without page refresh
- **Message persistence** in MongoDB
- **Message history** available after refresh
- **Sender/receiver information** with each message

## 🏗️ Project Structure

```
whatsapp-clone/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/                # Reusable components
│   │   │   ├── ChatList.js           # User list panel
│   │   │   ├── ChatList.css
│   │   │   ├── ChatWindow.js         # Message display & input
│   │   │   ├── ChatWindow.css
│   │   │   └── PrivateRoute.js       # Route protection
│   │   ├── contexts/                 # React Context
│   │   │   └── AuthContext.js        # Authentication state
│   │   ├── pages/                    # Pages
│   │   │   ├── Login.js              # Login page
│   │   │   ├── Signup.js             # Registration page
│   │   │   ├── Chat.js               # Main chat page
│   │   │   └── Auth.css              # Auth styling
│   │   ├── services/                 # API & Socket services
│   │   │   ├── api.js                # REST API client
│   │   │   └── socket.js             # Socket.IO client
│   │   ├── App.js                    # Route configuration
│   │   └── index.js                  # Entry point
│   └── package.json
│
└── backend/
    ├── src/
    │   ├── models/
    │   │   ├── User.js              # User schema
    │   │   └── Message.js           # Message schema
    │   ├── controllers/
    │   │   ├── userController.js    # Auth & user handlers
    │   │   └── messageController.js # Message handlers
    │   ├── routes/
    │   │   ├── userRoutes.js        # User endpoints
    │   │   └── messageRoutes.js     # Message endpoints
    │   └── server.js                # Express server
    ├── .env                         # Environment variables
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js v14 or higher
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/whatsapp_clone
   JWT_SECRET=whatsapp_clone_secret_key_123
   NODE_ENV=development
   ```

4. **Start backend server:**
   ```bash
   npm start
   # For development with auto-reload:
   npm run dev
   ```
   Backend runs on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start development server:**
   ```bash
   npm start
   ```
   Frontend runs on `http://localhost:3000`

## 📖 Usage Guide

### Creating Test Users

**User 1:**
- Username: `alice`
- Email: `alice@example.com`
- Password: `password123`

**User 2:**
- Username: `bob`
- Email: `bob@example.com`
- Password: `password123`

### Sending Messages

1. Sign up or login with first user account
2. Click on a user in the chat list (left panel)
3. Type message in the input field at bottom
4. Click "Send" button to send message
5. Message appears in real-time in the chat window

6. Open another browser window or incognito tab
7. Login with second user account
8. Click the first user from chat list
9. See the message in real-time
10. Reply and see it update instantly

## 🔌 API Endpoints

### Authentication
- `POST /api/users/signup` - Register new user
- `POST /api/users/login` - Login user

### User Management
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id` - Update user profile

### Messages
- `POST /api/messages/send` - Send message
- `GET /api/messages?senderId=xxx&receiverId=yyy` - Get conversation history
- `DELETE /api/messages/:id` - Delete message

## 💾 Database Schemas

### User Model
```javascript
{
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed, required),
  profilePicture: String,
  status: String,
  createdAt: Date
}
```

### Message Model
```javascript
{
  sender: ObjectId (ref: User, required),
  receiver: ObjectId (ref: User, required),
  content: String (required),
  timestamp: Date (default: now),
  isRead: Boolean
}
```

## 🔄 Socket.IO Events

### Server Events
- `connection` - New user connects
- `disconnect` - User disconnects
- `send_message` - Message sent
- `receive_message` - Message received

### Client Events
```javascript
// Emit
socket.emit('send_message', { sender, receiver, content, timestamp });

// Listen
socket.on('receive_message', (messageData) => {
  // Update UI with new message
});
```

## 🔐 Authentication Flow

1. User signs up with username, email, password
2. Password hashed using bcryptjs (10 salt rounds)
3. User stored in MongoDB
4. JWT token generated (expires in 24h)
5. Token stored in localStorage
6. Token sent with each API request
7. Protected routes check for valid token
8. Logout removes token from localStorage

## 🎨 UI Features

- **Responsive layout**: Two-panel chat interface
- **Color scheme**: WhatsApp green (#128c7e) themed
- **Message bubbles**: 
  - Sent messages: Light green background, right-aligned
  - Received messages: White background with border, left-aligned
- **User avatars**: Colored circles with user initials
- **Auto-scroll**: Latest messages visible without manual scrolling
- **Timestamp**: Each message shows time sent
- **Status indicators**: Active chat highlighted

## 🛠️ Tech Stack Details

### Frontend
- **React 18**: UI library
- **React Router v6**: Client-side routing
- **Axios**: HTTP client for API calls
- **Socket.IO Client**: Real-time communication
- **CSS3**: Styling with custom properties

### Backend
- **Express.js**: Web framework
- **MongoDB with Mongoose**: Database & ODM
- **Socket.IO**: WebSocket library
- **JWT**: Token-based authentication
- **Bcryptjs**: Password hashing
- **CORS**: Cross-origin requests
- **dotenv**: Environment variable management

## ⚙️ Configuration

### CORS Settings (Backend)
```javascript
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});
```

### API Base URL (Frontend)
- Development: `http://localhost:5000/api`
- Configure in `src/services/api.js`

### Socket.IO Connection (Frontend)
- Server: `http://localhost:5000`
- Auto-reconnect enabled
- Reconnection attempts: 5

## 🐛 Troubleshooting

### Issue: Backend connection fails
**Solution:** 
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`
- Verify port 5000 is available

### Issue: Frontend shows proxy errors
**Solution:**
- Make sure backend is running on port 5000
- Check that both frontend and backend are started
- Clear browser cache and reload

### Issue: Messages not updating in real-time
**Solution:**
- Verify Socket.IO connection in browser console
- Check that both users have open chat windows
- Ensure backend Socket.IO server is running

### Issue: Port already in use
**Solution:**
- Frontend: `PORT=3001 npm start`
- Backend: Change `PORT` in `.env` file

## 📈 Performance

- Messages loaded only for selected conversation
- Socket.IO events scoped to relevant users
- JWT tokens expire after 24 hours
- Database indexes on frequently queried fields
- Automatic message fetching on user selection

## 🔒 Security

- **Password hashing**: Bcryptjs with 10 salt rounds
- **Token-based auth**: JWT with 24-hour expiration
- **CORS**: Restricted to frontend origin
- **Input validation**: All API endpoints validate input
- **No sensitive data**: Passwords never sent to frontend
- **Secure headers**: HTTPS recommended in production

## 🚀 Deployment Notes

For production deployment:

1. **Frontend**:
   - Build: `npm run build`
   - Deploy to host (Vercel, Netlify, etc.)
   - Update API_URL to production backend

2. **Backend**:
   - Use production MongoDB connection string
   - Set `NODE_ENV=production`
   - Use HTTPS
   - Set secure JWT secret
   - Enable proper CORS for frontend domain

## 📚 Future Enhancements

- [ ] Group chats
- [ ] Message search
- [ ] Online/offline status
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Message editing
- [ ] File/image sharing
- [ ] User profiles
- [ ] Push notifications
- [ ] Dark mode
- [ ] Message reactions
- [ ] Voice/video calls

## 📝 License

MIT License - Feel free to use for personal or commercial projects

## 👥 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

---

**Happy Chatting! 💬**
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas account)

## Installation

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your MongoDB URI and other configurations

5. Start the backend server:
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Start the React development server:
   ```bash
   npm start
   ```

   The app will run on `http://localhost:3000`

## Available Endpoints

### Health Check
- `GET /api/health` - Server health status

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user

### Messages
- `POST /api/messages/send` - Send a message
- `GET /api/messages` - Get messages between two users
- `DELETE /api/messages/:id` - Delete a message

## Technologies Used

### Backend
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.io-client** - Real-time communication

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/whatsapp_clone
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Development Scripts

### Backend
- `npm run dev` - Start with nodemon (auto-reload)
- `npm start` - Start the server
- `npm test` - Run tests

### Frontend
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests

## Features to Implement

- [ ] User authentication (registration, login)
- [ ] Real-time messaging with Socket.io
- [ ] User search functionality
- [ ] Message history
- [ ] Online/offline status
- [ ] Message read receipts
- [ ] File/image sharing
- [ ] Group chat functionality
- [ ] User typing indicator
- [ ] Message notifications

## Contributing

Feel free to fork this project and submit pull requests for any improvements.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please create an issue in the repository.