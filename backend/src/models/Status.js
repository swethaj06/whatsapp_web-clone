const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaType: {
    type: String,
    enum: ['text', 'image', 'video'],
    default: 'text'
  },
  textColor: {
    type: String,
    default: '#000000'
  },
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  viewers: [{
    userId: mongoose.Schema.Types.ObjectId,
    viewedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-delete after 24 hours (86400 seconds)
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Status', statusSchema);
