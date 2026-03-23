const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required'],
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver is required'],
    index: true
  },
  content: {
    type: String,
    required: function() { 
      return this.messageType === 'text' && !this.isDeleted; 
    },
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'voice', 'document', 'location', 'sticker', 'call'],
    default: 'text'
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  // Call-specific fields (Optional based on type)
  callType: {
    type: String,
    enum: ['audio', 'video']
  },
  callStatus: {
    type: String,
    enum: ['missed', 'accepted', 'rejected', 'no_answer']
  },
  callDuration: {
    type: Number,
    default: 0
  },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileSize: { type: Number, default: null },
  fileDuration: { type: Number, default: null },
  fileMimeType: { type: String, default: null },
  storedFileName: { type: String, default: null },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isDelivered: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for optimized conversation fetching
messageSchema.index({ sender: 1, receiver: 1, timestamp: -1 });
messageSchema.index({ receiver: 1, sender: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
