const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospitalName: {
    type: String,
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  contactNumber: {
    type: String,
    required: true
  },
  emergencyNumber: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true
  },
  totalBeds: {
    type: Number,
    default: 0
  },
  availableBeds: {
    type: Number,
    default: 0
  },
  icuBeds: {
    type: Number,
    default: 0
  },
  availableIcuBeds: {
    type: Number,
    default: 0
  },
  specializations: {
    type: [String],
    default: []
  },
  facilities: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Hospital', hospitalSchema);
