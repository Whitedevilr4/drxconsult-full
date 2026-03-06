const mongoose = require('mongoose');

const customerServiceChatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for anonymous users
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    default: null
  },
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'admin'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['active', 'closed', 'waiting'],
    default: 'active'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date,
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
customerServiceChatSchema.index({ sessionId: 1 });
customerServiceChatSchema.index({ userId: 1 });
customerServiceChatSchema.index({ status: 1 });
customerServiceChatSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('CustomerServiceChat', customerServiceChatSchema);
