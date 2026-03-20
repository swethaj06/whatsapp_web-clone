const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const http = require('http');
const socketIO = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_clone');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
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

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

const ActivityLog = require('./models/ActivityLog');

// Socket.IO connection handling
io.on('connection', async (socket) => {
  try { await ActivityLog.create({ socketId: socket.id, action: 'connected' }); } catch(e) {}

  socket.on('join', async (userId) => {
    socket.join(userId);
    socket.userId = userId; // Store userId on socket for disconnect handling
    try { await ActivityLog.create({ socketId: socket.id, userId, action: 'joined_room' }); } catch(e) {}
    
    // Update user status to online
    const User = require('./models/User');
    try {
      await User.findByIdAndUpdate(userId, { status: 'online' });
      io.emit('user_status_change', { userId, status: 'online' });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  });

  socket.on('typing', (data) => {
    io.to(data.receiverId.toString()).emit('user_typing', { senderId: data.senderId });
  });

  socket.on('stop_typing', (data) => {
    io.to(data.receiverId.toString()).emit('user_stop_typing', { senderId: data.senderId });
  });

  socket.on('update_profile', (data) => {
    io.emit('user_profile_update', data);
  });

  socket.on('send_message', async (data) => {
    try { await ActivityLog.create({ socketId: socket.id, action: 'message_received' }); } catch(e) {}
    const receiverId = data.receiver._id || data.receiver;
    const senderId = data.sender._id || data.sender;
    io.to(receiverId.toString()).to(senderId.toString()).emit('receive_message', data);
  });

  socket.on('disconnect', async () => {
    try { await ActivityLog.create({ socketId: socket.id, userId: socket.userId, action: 'disconnected' }); } catch(e) {}
    if (socket.userId) {
      const User = require('./models/User');
      try {
        await User.findByIdAndUpdate(socket.userId, { status: 'offline' });
        io.emit('user_status_change', { userId: socket.userId, status: 'offline' });
      } catch (err) {
        console.error('Error updating status:', err);
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
