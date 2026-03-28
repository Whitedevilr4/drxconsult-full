const mongoose = require('mongoose');

const dayDietSchema = new mongoose.Schema({
  morning: { type: String, default: '' },
  lunch:   { type: String, default: '' },
  snack:   { type: String, default: '' },
  dinner:  { type: String, default: '' },
  water:   { type: Number, default: 0 },
  taken:   { type: Boolean, default: false },
  medicines: { type: String, default: '' },
}, { _id: false });

const dayProgressSchema = new mongoose.Schema({
  weight:   { type: Number, default: 0 },
  steps:    { type: Number, default: 0 },
  sleep:    { type: Number, default: 0 },
  calories: { type: Number, default: 0 },
  exercise: { type: Number, default: 0 },
  mood:     { type: Number, default: 0 },
}, { _id: false });

const subscriptionHealthDataSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekKey:   { type: String, required: true }, // YYYY-MM-DD (Monday of the week)
  diet:      { type: [dayDietSchema],     default: () => Array(7).fill({}) },
  progress:  { type: [dayProgressSchema], default: () => Array(7).fill({}) },
  stepTarget: { type: Number, default: 10000 },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

subscriptionHealthDataSchema.index({ patientId: 1, weekKey: 1 }, { unique: true });

module.exports = mongoose.model('SubscriptionHealthData', subscriptionHealthDataSchema);
