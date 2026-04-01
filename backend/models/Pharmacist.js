const mongoose = require('mongoose');

const pharmacistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  photo: String,
  designation: String,
  description: { type: String, default: '' },
  languages: [{ type: String }],
  status: { type: String, enum: ['online', 'offline'], default: 'online' },
  adminDisabled: { type: Boolean, default: false },
  coreTeam: { type: Boolean, default: false },
  totalPatientsCounselled: { type: Number, default: 0 },
  availableSlots: [{
    date: Date,
    startTime: String,
    endTime: String,
    isBooked: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pharmacist', pharmacistSchema);
