const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Caller is required'],
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver is required'],
    index: true
  },
  callType: {
    type: String,
    enum: ['audio', 'video'],
    required: [true, 'Call type is required']
  },
  callStatus: {
    type: String,
    enum: ['missed', 'accepted', 'rejected', 'no_answer'],
    default: 'no_answer'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
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

// Optimized indexes for call history fetching
callSchema.index({ caller: 1, receiver: 1, startTime: -1 });
callSchema.index({ receiver: 1, caller: 1, startTime: -1 });
callSchema.index({ startTime: -1 });

module.exports = mongoose.model('Call', callSchema);
