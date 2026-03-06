const mongoose = require('mongoose');

const hospitalQuerySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  queryType: {
    type: String,
    enum: ['bed_availability', 'doctor_availability', 'emergency', 'general'],
    required: true
  },
  bedType: {
    type: String,
    enum: ['general', 'icu', 'any'],
    default: 'any'
  },
  specialization: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  userLatitude: {
    type: Number,
    default: null
  },
  userLongitude: {
    type: Number,
    default: null
  },
  userLocation: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  acceptedByHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HospitalQuery', hospitalQuerySchema);
