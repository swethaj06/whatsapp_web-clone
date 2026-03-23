const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  socketId: {
    type: String,
    required: [true, 'Socket ID is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    index: true
  },
  details: {
    type: String,
    default: ''
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

module.exports = mongoose.model('ActivityLog', activityLogSchema);
