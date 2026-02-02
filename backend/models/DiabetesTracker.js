const mongoose = require('mongoose');

const glucoseReadingSchema = new mongoose.Schema({
  glucoseLevel: { type: Number, required: true }, // mg/dL
  readingType: { 
    type: String, 
    enum: ['fasting', 'before_meal', 'after_meal', 'postMeal', 'bedtime', 'random'],
    required: true 
  },
  readingDate: { type: Date, default: Date.now },
  takenAt: { type: Date, default: Date.now }, // Frontend expects this field
  mealDetails: { type: String }, // What was eaten (for after meal readings)
  medication: { type: String }, // Frontend field
  carbs: { type: String }, // Frontend field
  exercise: { type: String }, // Frontend field
  insulinTaken: { type: Boolean, default: false },
  insulinUnits: { type: Number },
  notes: { type: String },
  category: { 
    type: String, 
    enum: ['low', 'normal', 'pre_diabetic', 'diabetic', 'high'],
    required: true 
  }
});

const hba1cRecordSchema = new mongoose.Schema({
  hba1cValue: { type: Number, required: true }, // Percentage
  testDate: { type: Date, required: true },
  laboratoryName: { type: String },
  notes: { type: String }
});

const diabetesTrackerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['male', 'female'], required: true },
  diabetesType: { type: String, enum: ['type1', 'type2', 'gestational', 'prediabetes'], required: true },
  diagnosisDate: { type: Date },
  medications: [{ 
    name: { type: String },
    dosage: { type: String },
    frequency: { type: String },
    type: { type: String, enum: ['insulin', 'metformin', 'other'] }
  }],
  glucoseReadings: [glucoseReadingSchema],
  hba1cRecords: [hba1cRecordSchema],
  targetGlucoseRange: {
    fasting: { min: { type: Number, default: 80 }, max: { type: Number, default: 130 } },
    afterMeal: { min: { type: Number, default: 80 }, max: { type: Number, default: 180 } }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
diabetesTrackerSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Method to categorize glucose reading
diabetesTrackerSchema.methods.categorizeGlucose = function(glucoseLevel, readingType) {
  if (glucoseLevel < 70) {
    return 'low';
  }
  
  switch (readingType) {
    case 'fasting':
      if (glucoseLevel <= 99) return 'normal';
      if (glucoseLevel <= 125) return 'pre_diabetic';
      return 'diabetic';
    
    case 'after_meal':
      if (glucoseLevel <= 139) return 'normal';
      if (glucoseLevel <= 199) return 'pre_diabetic';
      return 'diabetic';
    
    case 'random':
      if (glucoseLevel <= 139) return 'normal';
      if (glucoseLevel <= 199) return 'pre_diabetic';
      return 'diabetic';
    
    default:
      if (glucoseLevel <= 139) return 'normal';
      if (glucoseLevel > 250) return 'high';
      return 'diabetic';
  }
};

// Method to get latest reading
diabetesTrackerSchema.methods.getLatestReading = function() {
  if (this.glucoseReadings.length === 0) return null;
  return this.glucoseReadings[this.glucoseReadings.length - 1];
};

// Method to get average glucose over last 7 days
diabetesTrackerSchema.methods.getWeeklyAverage = function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentReadings = this.glucoseReadings.filter(reading => 
    new Date(reading.readingDate) >= sevenDaysAgo
  );
  
  if (recentReadings.length === 0) return null;
  
  return Math.round(
    recentReadings.reduce((sum, reading) => sum + reading.glucoseLevel, 0) / recentReadings.length
  );
};

// Method to get glucose trend
diabetesTrackerSchema.methods.getGlucoseTrend = function() {
  if (this.glucoseReadings.length < 2) return 'insufficient_data';
  
  const recent = this.glucoseReadings.slice(-5); // Last 5 readings
  const older = this.glucoseReadings.slice(-10, -5); // Previous 5 readings
  
  if (older.length === 0) return 'insufficient_data';
  
  const recentAvg = recent.reduce((sum, r) => sum + r.glucoseLevel, 0) / recent.length;
  const olderAvg = older.reduce((sum, r) => sum + r.glucoseLevel, 0) / older.length;
  
  const difference = recentAvg - olderAvg;
  
  if (difference > 20) return 'increasing';
  if (difference < -20) return 'decreasing';
  return 'stable';
};

// Method to get time in range percentage
diabetesTrackerSchema.methods.getTimeInRange = function(days = 7) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - days);
  
  const recentReadings = this.glucoseReadings.filter(reading => 
    new Date(reading.readingDate) >= targetDate
  );
  
  if (recentReadings.length === 0) return null;
  
  const inRangeCount = recentReadings.filter(reading => {
    const { glucoseLevel, readingType } = reading;
    const target = this.targetGlucoseRange[readingType] || this.targetGlucoseRange.fasting;
    return glucoseLevel >= target.min && glucoseLevel <= target.max;
  }).length;
  
  return Math.round((inRangeCount / recentReadings.length) * 100);
};

module.exports = mongoose.model('DiabetesTracker', diabetesTrackerSchema);