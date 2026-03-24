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
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const uploadsRoot = path.join(__dirname, '../uploads');

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
let dbConnected = false;
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_clone');
    console.log('✅ MongoDB connected successfully');
    dbConnected = true;
    
    // Reset all users to offline on server startup
    await User.updateMany({}, { status: 'offline' });
    console.log('🧹 Initialized all users to offline status');
  } catch (error) {
    console.error('⚠️  MongoDB connection error:', error.message);
    console.log('📌 Server running in limited mode. To fully enable features:');
    console.log('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
    console.log('   2. Start MongoDB: mongod');
    console.log('   3. Or use MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
    dbConnected = false;
  }
};

// Connect to database
connectDB();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
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
    socket.userId = userId; // Store userId on socket for disconnect handling
    try { await ActivityLog.create({ socketId: socket.id, userId, action: 'joined_room' }); } catch(e) {}

    const normalizedUserId = userId?.toString();
    const existingConnections = userSocketConnections.get(normalizedUserId) || new Set();
    existingConnections.add(socket.id);
    userSocketConnections.set(normalizedUserId, existingConnections);
    const isFirstActiveConnection = existingConnections.size === 1;
    
    // Update user status to online
    try {
      if (isFirstActiveConnection) {
        const updatedUser = await User.findByIdAndUpdate(userId, { status: 'online' }, { new: true });
        if (updatedUser) {
          console.log(`✅ User ${userId} (${updatedUser.username}) marked as online`);
          io.emit('user_status_change', { userId: userId.toString(), status: 'online' });
        } else {
          console.warn(`⚠️ User ${userId} not found during join`);
        }
      }

      // Mark pending messages as delivered
      const pendingMessages = await Message.find({ receiver: userId, isDelivered: false });
      if (pendingMessages.length > 0) {
        const messageIds = pendingMessages.map(m => m._id);
        await Message.updateMany({ _id: { $in: messageIds } }, { isDelivered: true });
        
        // Group by sender to notify them
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

  socket.on('update_profile', (data) => {
    io.emit('user_profile_update', data);
  });

  socket.on('join_group', (groupId) => {
    const normalizedGroupId = groupId?.toString();
    console.log('👥 USER JOINED GROUP - GroupId:', normalizedGroupId, 'SocketId:', socket.id);
    socket.join(normalizedGroupId);
    try { 
      ActivityLog.create({ socketId: socket.id, action: 'joined_group', groupId: normalizedGroupId }); 
    } catch(e) {}
  });

  socket.on('leave_group', (groupId) => {
    const normalizedGroupId = groupId?.toString();
    console.log('👥 USER LEFT GROUP - GroupId:', normalizedGroupId, 'SocketId:', socket.id);
    socket.leave(normalizedGroupId);
    try { 
      ActivityLog.create({ socketId: socket.id, action: 'left_group', groupId: normalizedGroupId }); 
    } catch(e) {}
  });

  socket.on('send_message', async (data) => {
    try { await ActivityLog.create({ socketId: socket.id, action: 'message_received' }); } catch(e) {}
    const receiverId = data.receiver._id || data.receiver;
    const senderId = data.sender._id || data.sender;

    // Check if recipient is online to set initial delivery status
    const isReceiverOnline = io.sockets.adapter.rooms.has(receiverId.toString());
    if (isReceiverOnline && data._id) {
       await Message.findByIdAndUpdate(data._id, { isDelivered: true });
       data.isDelivered = true;
    }

    io.to(receiverId.toString()).to(senderId.toString()).emit('receive_message', data);
    
    if (isReceiverOnline) {
      io.to(senderId.toString()).emit('messages_delivered', {
        receiverId,
        senderId,
        messageIds: [data._id]
      });
    }
  });

  socket.on('send_group_message', async (data) => {
    try { await ActivityLog.create({ socketId: socket.id, action: 'group_message_received' }); } catch(e) {}
    const groupId = data.group._id || data.group;
    
    // Broadcast group message to all members in the group
    io.to(groupId.toString()).emit('receive_group_message', data);
  });

  socket.on('call_user', async (data) => {
    const targetUserId = data?.toUserId;
    const callerUserId = data?.fromUserId;

    console.log('📞 CALL_USER EVENT - From:', callerUserId, 'To:', targetUserId, 'Type:', data.callType);

    if (!targetUserId || !callerUserId || !data?.offer) {
      socket.emit('call_error', { message: 'Invalid call request.' });
      return;
    }

    try {
      const Call = require('./models/Call');

      const existingCall = activeCalls.get(targetUserId.toString());
      if (existingCall && existingCall.status !== 'ended') {
        socket.emit('call_busy', {
          toUserId: targetUserId,
          reason: 'busy'
        });
        io.to(targetUserId.toString()).emit('call_busy', {
          toUserId: callerUserId,
          reason: 'busy'
        });
        return;
      }

      const callRecord = await Call.create({
        caller: callerUserId,
        receiver: targetUserId,
        callType: data.callType,
        callStatus: 'no_answer',
        startTime: new Date()
      });

      const activeCall = {
        callId: callRecord._id.toString(),
        callerId: callerUserId.toString(),
        receiverId: targetUserId.toString(),
        callType: data.callType,
        status: 'ringing',
        startedAt: Date.now()
      };

      activeCalls.set(callerUserId.toString(), activeCall);
      activeCalls.set(targetUserId.toString(), activeCall);

      socket.currentCallId = callRecord._id.toString();
      socket.callStartTime = Date.now();

      socket.emit('call_initiated', {
        callId: callRecord._id,
        toUserId: targetUserId,
        callType: data.callType
      });

      io.to(targetUserId.toString()).emit('incoming_call', {
        callId: callRecord._id,
        fromUserId: callerUserId,
        fromUserName: data.fromUserName,
        fromUserAvatar: data.fromUserAvatar || '',
        callType: data.callType,
        offer: data.offer
      });
    } catch (err) {
      console.error('❌ Error creating call record:', err);
      socket.emit('call_error', { message: 'Unable to start the call.' });
    }
  });

  socket.on('answer_call', async (data) => {
    const targetUserId = data?.toUserId;
    const fromUserId = data?.fromUserId;
    if (!targetUserId || !fromUserId || !data?.answer) return;

    try {
      const Call = require('./models/Call');

      if (data.callId) {
        await Call.findByIdAndUpdate(data.callId, {
          callStatus: 'accepted'
        });
      }

      const activeCall = activeCalls.get(fromUserId.toString()) || activeCalls.get(targetUserId.toString());
      if (activeCall) {
        activeCall.status = 'accepted';
        activeCalls.set(fromUserId.toString(), activeCall);
        activeCalls.set(targetUserId.toString(), activeCall);
      }

      io.to(targetUserId.toString()).emit('call_answered', {
        callId: data.callId,
        fromUserId,
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
    const fromUserId = data?.fromUserId;
    if (!targetUserId || !fromUserId) return;

    try {
      const Call = require('./models/Call');
      const Message = require('./models/Message');

      const reason = data.reason || 'rejected';
      const callStatus = reason === 'busy' ? 'rejected' : 'missed';

      if (data.callId) {
        const callRecord = await Call.findByIdAndUpdate(data.callId, {
          callStatus,
          endTime: new Date(),
          duration: 0
        }, { new: true });

        if (callRecord) {
          const message = await Message.create({
            sender: callRecord.caller,
            receiver: callRecord.receiver,
            messageType: 'call',
            callType: callRecord.callType,
            callStatus,
            callDuration: 0,
            content: buildCallMessageContent(callRecord.callType, callStatus),
            timestamp: new Date()
          });

          await Call.findByIdAndUpdate(data.callId, { messageId: message._id });
          io.to(callRecord.caller.toString()).to(callRecord.receiver.toString()).emit('receive_message', message);
        }
      }

      activeCalls.delete(targetUserId.toString());
      activeCalls.delete(fromUserId.toString());

      io.to(targetUserId.toString()).emit('call_rejected', {
        callId: data.callId,
        fromUserId,
        reason
      });
    } catch (err) {
      console.error('Error handling call rejection:', err);
    }
  });

  socket.on('end_call', async (data) => {
    const targetUserId = data?.toUserId;
    const fromUserId = data?.fromUserId;
    if (!targetUserId || !fromUserId) return;

    try {
      const Call = require('./models/Call');
      const Message = require('./models/Message');

      if (data.callId) {
        const callRecord = await Call.findByIdAndUpdate(data.callId, {
          callStatus: 'accepted',
          endTime: new Date(),
          duration: data.duration || 0
        }, { new: true });

        if (callRecord && (data.duration || 0) > 0) {
          const message = await Message.create({
            sender: callRecord.caller,
            receiver: callRecord.receiver,
            messageType: 'call',
            callType: callRecord.callType,
            callStatus: 'accepted',
            callDuration: data.duration || 0,
            content: buildCallMessageContent(callRecord.callType, 'accepted'),
            timestamp: new Date()
          });

          await Call.findByIdAndUpdate(data.callId, { messageId: message._id });
          io.to(callRecord.caller.toString()).to(callRecord.receiver.toString()).emit('receive_message', message);
        }
      }

      activeCalls.delete(targetUserId.toString());
      activeCalls.delete(fromUserId.toString());

      io.to(targetUserId.toString()).emit('call_ended', {
        callId: data.callId,
        fromUserId,
        duration: data.duration || 0,
        reason: data.reason || 'ended'
      });
    } catch (err) {
      console.error('Error handling call end:', err);
    }
  });

  socket.on('disconnect', async () => {
    try { await ActivityLog.create({ socketId: socket.id, userId: socket.userId, action: 'disconnected' }); } catch(e) {}
    const userId = socket.userId;
    if (userId) {
      try {
        const normalizedUserId = userId.toString();
        const existingConnections = userSocketConnections.get(normalizedUserId);

        if (existingConnections) {
          existingConnections.delete(socket.id);

          if (existingConnections.size === 0) {
            userSocketConnections.delete(normalizedUserId);

            // Update user status to offline only when no active sockets remain
            const updatedUser = await User.findByIdAndUpdate(
              userId,
              { status: 'offline', lastSeen: new Date() },
              { new: true }
            );

            if (updatedUser) {
              console.log(`❌ User ${userId} (${updatedUser.username}) marked as offline`);
              io.emit('user_status_change', { userId: userId.toString(), status: 'offline' });
            }
          } else {
            userSocketConnections.set(normalizedUserId, existingConnections);
            console.log(`ℹ️ User ${userId} still has ${existingConnections.size} active connection(s)`);
          }
        }
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
