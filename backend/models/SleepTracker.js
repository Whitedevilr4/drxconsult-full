const mongoose = require('mongoose');

const sleepEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  bedTime: {
    type: String,
    required: true
  },
  sleepTime: {
    type: String,
    required: true
  },
  wakeTime: {
    type: String,
    required: true
  },
  sleepQuality: {
    type: String,
    enum: ['poor', 'fair', 'good', 'excellent'],
    required: true
  },
  sleepDuration: {
    type: Number, // in hours
    required: true
  },
  timeToFallAsleep: {
    type: Number, // in minutes
    required: true
  },
  nightWakeups: {
    type: Number,
    default: 0
  },
  caffeineIntake: {
    type: String,
    enum: ['none', 'low', 'moderate', 'high'],
    default: 'none'
  },
  screenTimeBeforeBed: {
    type: Number, // in minutes
    default: 0
  },
  exerciseToday: {
    type: Boolean,
    default: false
  },
  stressLevel: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    default: 'low'
  },
  notes: {
    type: String,
    maxlength: 500
  }
});

const sleepTrackerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entries: [sleepEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

sleepTrackerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('SleepTracker', sleepTrackerSchema);