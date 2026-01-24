const mongoose = require('mongoose');

const customerServiceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  icon: {
    type: String,
    default: '📞'
  },
  contactMethod: {
    type: String,
    enum: ['phone', 'email', 'chat', 'form', 'whatsapp'],
    required: true
  },
  contactValue: {
    type: String,
    required: true
  },
  workingHours: {
    type: String,
    default: '24/7'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for better query performance
customerServiceSchema.index({ order: 1 });
customerServiceSchema.index({ isActive: 1 });

module.exports = mongoose.model('CustomerService', customerServiceSchema);