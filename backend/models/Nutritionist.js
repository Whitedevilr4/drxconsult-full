const mongoose = require('mongoose');

const nutritionistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialization: {
    type: String,
    required: true
  },
  qualification: {
    type: String,
    required: true
  },
  experience: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  photo: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'busy'],
    default: 'offline'
  },
  consultationFee: {
    type: Number,
    default: 500
  },
  availableSlots: [{
    date: Date,
    startTime: String,
    endTime: String,
    isBooked: { type: Boolean, default: false }
  }],
  rating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  licenseNumber: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Nutritionist', nutritionistSchema);
