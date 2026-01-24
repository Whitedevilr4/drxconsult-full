const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
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
    maxlength: 2000
  },
  category: {
    type: String,
    enum: [
      'technical_issue',
      'service_quality',
      'billing',
      'pharmacist_behavior',
      'appointment_issue',
      'platform_bug',
      'privacy_concern',
      'other'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Admin response
  adminResponse: {
    message: String,
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: Date
  },
  
  // Resolution details
  resolution: {
    message: String,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    satisfactionRating: { type: Number, min: 1, max: 5 }
  },
  
  // Related entities
  relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  relatedPharmacist: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacist' },
  
  // Tracking
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [String],
  internalNotes: [{
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better query performance
complaintSchema.index({ userId: 1, status: 1 });
complaintSchema.index({ category: 1, priority: 1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);