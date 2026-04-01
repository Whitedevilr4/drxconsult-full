const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialization: { type: String, required: true },
  qualification: { type: String, required: true },
  experience: { type: Number, required: true },
  description: { type: String, default: '' },
  photo: { type: String, default: '' },
  languages: [{ type: String }],
  status: { type: String, enum: ['online', 'offline', 'busy'], default: 'offline' },
  adminDisabled: { type: Boolean, default: false },
  coreTeam: { type: Boolean, default: false },
  consultationFee: { type: Number, default: 500 },
  availableSlots: [{
    date: Date,
    startTime: String,
    endTime: String,
    isBooked: { type: Boolean, default: false }
  }],
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  licenseNumber: { type: String, required: true },
  signatureUrl: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
