const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema({
  professionalId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Pharmacist/Doctor/Nutritionist _id
  professionalUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professionalType: { type: String, enum: ['pharmacist', 'doctor', 'nutritionist'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // admin
}, { timestamps: true });

module.exports = mongoose.model('Incentive', incentiveSchema);
