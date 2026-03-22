const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: function() { return this.messageType === 'text'; }
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'sticker'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  fileMimeType: {
    type: String,
    default: null
  },
  storedFileName: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

messageSchema.index({ sender: 1, receiver: 1, timestamp: 1 });
messageSchema.index({ receiver: 1, sender: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);