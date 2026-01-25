const mongoose = require('mongoose');

const legalPageSchema = new mongoose.Schema({
  pageType: {
    type: String,
    enum: ['privacy-policy', 'terms-and-conditions', 'refund-policy', 'disclaimer'],
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  version: {
    type: String,
    default: '1.0'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for better query performance
legalPageSchema.index({ isActive: 1 });

module.exports = mongoose.model('LegalPage', legalPageSchema);
