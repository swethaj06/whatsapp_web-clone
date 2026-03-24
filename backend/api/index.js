const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const http = require('http');
const path = require('path');
const fs = require('fs');
const socketIO = require('socket.io');

// Load environment variables
dotenv.config();

const User = require('./models/User');
const Message = require('./models/Message');
const Group = require('./models/Group');

const app = express();
const server = http.createServer(app);

// Determine CORS origin based on environment
const corsOrigin = process.env.CORS_ORIGIN || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

const io = socketIO(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST']
  }
});

const uploadsRoot = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadsRoot));

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Database Connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_clone', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB connected successfully');
      
      // Reset all users to offline on server startup
      await User.updateMany({}, { status: 'offline' });
      console.log('🧹 Initialized all users to offline status');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Connect to database
connectDB();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Import routes
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const groupRoutes = require('./routes/groupRoutes');
const statusRoutes = require('./routes/statusRoutes');

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/status', statusRoutes);

const ActivityLog = require('./models/ActivityLog');
const activeCalls = new Map();
const userSocketConnections = new Map();

const buildCallMessageContent = (callType, callStatus) => {
  const callLabel = callType === 'video' ? 'video' : 'audio';

  if (callStatus === 'missed') {
    return `Missed ${callLabel} call`;
  }

  if (callStatus === 'rejected') {
    return `Declined ${callLabel} call`;
  }

  return `${callLabel === 'video' ? 'Video' : 'Audio'} call`;
};

// Socket.IO connection handling
io.on('connection', async (socket) => {
  try { await ActivityLog.create({ socketId: socket.id, action: 'connected' }); } catch(e) {}

  socket.on('join', async (userId) => {
    console.log('👤 USER JOINED - UserId:', userId, 'SocketId:', socket.id);
    socket.join(userId);
    socket.userId = userId;
    try { await ActivityLog.create({ socketId: socket.id, userId, action: 'joined_room' }); } catch(e) {}

    const normalizedUserId = userId?.toString();
    const existingConnections = userSocketConnections.get(normalizedUserId) || new Set();
    existingConnections.add(socket.id);
    userSocketConnections.set(normalizedUserId, existingConnections);
    const isFirstActiveConnection = existingConnections.size === 1;
    
    try {
      if (isFirstActiveConnection) {
        const updatedUser = await User.findByIdAndUpdate(userId, { status: 'online' }, { new: true });
        if (updatedUser) {
          console.log(`✅ User ${userId} (${updatedUser.username}) marked as online`);
          io.emit('user_status_change', { userId: userId.toString(), status: 'online' });
        }
      }

      const pendingMessages = await Message.find({ receiver: userId, isDelivered: false });
      if (pendingMessages.length > 0) {
        const messageIds = pendingMessages.map(m => m._id);
        await Message.updateMany({ _id: { $in: messageIds } }, { isDelivered: true });
        
        const senders = [...new Set(pendingMessages.map(m => m.sender.toString()))];
        senders.forEach(senderId => {
          const senderMessages = pendingMessages.filter(m => m.sender.toString() === senderId).map(m => m._id);
          io.to(senderId).emit('messages_delivered', {
            receiverId: userId,
            senderId,
            messageIds: senderMessages
          });
        });
      }
    } catch (err) {
      console.error('Error updating status/delivery on join:', err);
    }
  });

  socket.on('typing', (data) => {
    io.to(data.receiverId.toString()).emit('user_typing', { senderId: data.senderId });
  });

  socket.on('stop_typing', (data) => {
    io.to(data.receiverId.toString()).emit('user_stop_typing', { senderId: data.senderId });
  });

  socket.on('disconnect', async () => {
    const userId = socket.userId;
    if (userId) {
      const normalizedUserId = userId.toString();
      const connections = userSocketConnections.get(normalizedUserId);
      
      if (connections) {
        connections.delete(socket.id);
        
        if (connections.size === 0) {
          userSocketConnections.delete(normalizedUserId);
          
          try {
            const user = await User.findByIdAndUpdate(userId, { status: 'offline' }, { new: true });
            if (user) {
              console.log(`❌ User ${userId} (${user.username}) marked as offline`);
              io.emit('user_status_change', { userId: normalizedUserId, status: 'offline' });
            }
          } catch (err) {
            console.error('Error updating status on disconnect:', err);
          }
        }
      }
    }
  });
});

module.exports = app;

// Export server for serverless functions
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
