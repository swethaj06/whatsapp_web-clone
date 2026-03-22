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

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const uploadsRoot = path.join(__dirname, '../uploads');
const messageUploadsDirectory = path.join(uploadsRoot, 'messages');

if (!fs.existsSync(messageUploadsDirectory)) {
  fs.mkdirSync(messageUploadsDirectory, { recursive: true });
}

// Middleware
app.use(cors());
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
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_clone');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Reset all users to offline on server startup
const resetUsersOffline = async () => {
  try {
    const User = require('./models/User');
    await User.updateMany({}, { status: 'offline' });
    console.log('All users reset to offline on server startup');
  } catch (error) {
    console.error('Error resetting users to offline:', error);
  }
};

resetUsersOffline();

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
    console.log('👤 USER JOINED - UserId:', userId, 'SocketId:', socket.id);
    socket.join(userId);
    socket.userId = userId; // Store userId on socket for disconnect handling
    try { await ActivityLog.create({ socketId: socket.id, userId, action: 'joined_room' }); } catch(e) {}
    
    // Update user status to online
    const User = require('./models/User');
    try {
      await User.findByIdAndUpdate(userId, { status: 'online' });
      console.log(`✅ User ${userId} marked as online`);
      io.emit('user_status_change', { userId, status: 'online' });
    } catch (err) {
      console.error('Error updating status on join:', err);
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

  socket.on('call_user', async (data) => {
    const targetUserId = data?.toUserId;
    console.log('📞 CALL_USER EVENT - From:', data.fromUserId, 'To:', targetUserId, 'Type:', data.callType);
    
    if (!targetUserId) {
      console.log('⚠️ No target user ID provided');
      return;
    }

    try {
      const Call = require('./models/Call');
      const caller = data.fromUserId;
      
      // Create call record
      const callRecord = await Call.create({
        caller,
        receiver: targetUserId,
        callType: data.callType,
        callStatus: 'no_answer',
        startTime: new Date()
      });
      
      console.log('✅ Call record created:', callRecord._id);

      // Store call ID in socket for reference
      socket.currentCallId = callRecord._id;
      socket.callStartTime = Date.now();

      // Send call initiated response to caller with callId
      socket.emit('call_initiated', {
        callId: callRecord._id
      });
      console.log('📤 Sent call_initiated to caller');

      // Send incoming call to receiver with callId
      console.log('📤 Sending incoming_call to room:', targetUserId.toString());
      io.to(targetUserId.toString()).emit('incoming_call', {
        callId: callRecord._id,
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
        fromUserAvatar: data.fromUserAvatar || '',
        callType: data.callType,
        offer: data.offer
      });
      console.log('✅ Incoming call event sent to receiver');
    } catch (err) {
      console.error('❌ Error creating call record:', err);
    }
  });

  socket.on('answer_call', async (data) => {
    const targetUserId = data?.toUserId;
    if (!targetUserId) return;

    try {
      const Call = require('./models/Call');
      
      // Update call record
      if (data.callId) {
        await Call.findByIdAndUpdate(data.callId, {
          callStatus: 'accepted'
        });
      }

      io.to(targetUserId.toString()).emit('call_answered', {
        fromUserId: data.fromUserId,
        answer: data.answer,
        callType: data.callType
      });
    } catch (err) {
      console.error('Error updating call record:', err);
    }
  });

  socket.on('ice_candidate', (data) => {
    const targetUserId = data?.toUserId;
    if (!targetUserId) return;

    io.to(targetUserId.toString()).emit('ice_candidate', {
      fromUserId: data.fromUserId,
      candidate: data.candidate
    });
  });

  socket.on('reject_call', async (data) => {
    const targetUserId = data?.toUserId;
    if (!targetUserId) return;

    try {
      const Call = require('./models/Call');
      const Message = require('./models/Message');
      
      const reason = data.reason || 'rejected';
      const callStatus = reason === 'busy' ? 'rejected' : 'missed';

      // Update call record
      if (data.callId) {
        const callRecord = await Call.findByIdAndUpdate(data.callId, {
          callStatus,
          endTime: new Date(),
          duration: 0
        }, { new: true });

        // Create message for missed call
        if (callRecord) {
          await Message.create({
            sender: callRecord.caller,
            receiver: callRecord.receiver,
            messageType: 'call',
            callType: callRecord.callType,
            callStatus: 'missed',
            content: `Missed ${callRecord.callType} call`,
            timestamp: new Date()
          });
        }
      }

      io.to(targetUserId.toString()).emit('call_rejected', {
        fromUserId: data.fromUserId,
        reason: data.reason || 'rejected'
      });
    } catch (err) {
      console.error('Error handling call rejection:', err);
    }
  });

  socket.on('end_call', async (data) => {
    const targetUserId = data?.toUserId;
    if (!targetUserId) return;

    try {
      const Call = require('./models/Call');
      
      // Update call record with duration
      if (data.callId) {
        await Call.findByIdAndUpdate(data.callId, {
          callStatus: 'accepted',
          endTime: new Date(),
          duration: data.duration || 0
        });
      }

      io.to(targetUserId.toString()).emit('call_ended', {
        fromUserId: data.fromUserId,
        reason: data.reason || 'ended'
      });
    } catch (err) {
      console.error('Error handling call end:', err);
    }
  });

  socket.on('disconnect', async () => {
    try { await ActivityLog.create({ socketId: socket.id, userId: socket.userId, action: 'disconnected' }); } catch(e) {}
    if (socket.userId) {
      const User = require('./models/User');
      try {
        // Update user status to offline in database
        await User.findByIdAndUpdate(socket.userId, { status: 'offline' });
        console.log(`User ${socket.userId} marked as offline`);
        
        // Broadcast status change to all connected clients
        io.emit('user_status_change', { userId: socket.userId, status: 'offline' });
      } catch (err) {
        console.error('Error updating status on disconnect:', err);
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }

  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
