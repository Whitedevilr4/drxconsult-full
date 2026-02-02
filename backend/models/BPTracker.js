const mongoose = require('mongoose');

const bpReadingSchema = new mongoose.Schema({
  systolic: { type: Number, required: true },
  diastolic: { type: Number, required: true },
  pulse: { type: Number },
  heartRate: { type: Number }, // Alias for pulse
  readingDate: { type: Date, default: Date.now },
  takenAt: { type: Date, default: Date.now }, // Frontend expects this field
  timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night'] },
  beforeMedication: { type: Boolean, default: true },
  notes: { type: String },
  category: { type: String, enum: ['normal', 'elevated', 'high_stage1', 'high_stage2', 'crisis'] }
});

const bpTrackerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['male', 'female'], required: true },
  medications: [{ 
    name: { type: String },
    dosage: { type: String },
    frequency: { type: String }
  }],
  readings: [bpReadingSchema],
  targetSystolic: { type: Number, default: 120 },
  targetDiastolic: { type: Number, default: 80 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
bpTrackerSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Method to categorize BP reading
bpTrackerSchema.methods.categorizeBP = function(systolic, diastolic) {
  if (systolic >= 180 || diastolic >= 120) {
    return 'crisis';
  } else if (systolic >= 140 || diastolic >= 90) {
    return 'high_stage2';
  } else if (systolic >= 130 || diastolic >= 80) {
    return 'high_stage1';
  } else if (systolic >= 120 && diastolic < 80) {
    return 'elevated';
  } else {
    return 'normal';
  }
};

// Method to get latest reading
bpTrackerSchema.methods.getLatestReading = function() {
  if (this.readings.length === 0) return null;
  return this.readings[this.readings.length - 1];
};

// Method to get average BP over last 7 days
bpTrackerSchema.methods.getWeeklyAverage = function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentReadings = this.readings.filter(reading => 
    new Date(reading.readingDate) >= sevenDaysAgo
  );
  
  if (recentReadings.length === 0) return null;
  
  const avgSystolic = Math.round(
    recentReadings.reduce((sum, reading) => sum + reading.systolic, 0) / recentReadings.length
  );
  const avgDiastolic = Math.round(
    recentReadings.reduce((sum, reading) => sum + reading.diastolic, 0) / recentReadings.length
  );
  
  return { systolic: avgSystolic, diastolic: avgDiastolic };
};

// Method to get BP trend
bpTrackerSchema.methods.getBPTrend = function() {
  if (this.readings.length < 2) return 'insufficient_data';
  
  const recent = this.readings.slice(-5); // Last 5 readings
  const older = this.readings.slice(-10, -5); // Previous 5 readings
  
  if (older.length === 0) return 'insufficient_data';
  
  const recentAvg = recent.reduce((sum, r) => sum + r.systolic + r.diastolic, 0) / (recent.length * 2);
  const olderAvg = older.reduce((sum, r) => sum + r.systolic + r.diastolic, 0) / (older.length * 2);
  
  const difference = recentAvg - olderAvg;
  
  if (difference > 5) return 'increasing';
  if (difference < -5) return 'decreasing';
  return 'stable';
};

module.exports = mongoose.model('BPTracker', bpTrackerSchema);