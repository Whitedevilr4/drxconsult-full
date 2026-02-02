const mongoose = require('mongoose');

const periodRecordSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  cycleLength: { type: Number, default: 28 },
  flow: { type: String, enum: ['light', 'normal', 'heavy'], default: 'normal' },
  symptoms: [{
    type: String,
    enum: ['cramps', 'headache', 'mood_swings', 'bloating', 'fatigue', 'acne', 'breast_tenderness']
  }],
  notes: { type: String }
});

const pcosAssessmentSchema = new mongoose.Schema({
  acne: { type: Boolean, default: false },
  hairLoss: { type: Boolean, default: false },
  excessiveHairGrowth: { type: Boolean, default: false },
  weightGain: { type: Boolean, default: false },
  irregularPeriods: { type: Boolean, default: false },
  darkSkinPatches: { type: Boolean, default: false },
  difficultyLosingWeight: { type: Boolean, default: false },
  moodChanges: { type: Boolean, default: false },
  assessmentDate: { type: Date, default: Date.now },
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['low', 'moderate', 'high'], default: 'low' },
  recommendations: [{ type: String }]
});

const periodTrackerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  womanName: { type: String, required: true },
  age: { type: Number, required: true },
  averageCycleLength: { type: Number, default: 28 },
  lastPeriodDate: { type: Date, required: true },
  periods: [periodRecordSchema],
  pcosAssessments: [pcosAssessmentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
periodTrackerSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Method to predict next period date
periodTrackerSchema.methods.getNextPeriodDate = function() {
  const lastPeriod = new Date(this.lastPeriodDate);
  const nextPeriod = new Date(lastPeriod);
  nextPeriod.setDate(lastPeriod.getDate() + this.averageCycleLength);
  return nextPeriod;
};

// Method to get days until next period
periodTrackerSchema.methods.getDaysUntilNextPeriod = function() {
  const now = new Date();
  const nextPeriod = this.getNextPeriodDate();
  const diffTime = nextPeriod - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Method to calculate PCOS risk
periodTrackerSchema.methods.calculatePCOSRisk = function(assessment) {
  let score = 0;
  const symptoms = [
    'acne', 'hairLoss', 'excessiveHairGrowth', 'weightGain', 
    'irregularPeriods', 'darkSkinPatches', 'difficultyLosingWeight', 'moodChanges'
  ];
  
  symptoms.forEach(symptom => {
    if (assessment[symptom]) score += 1;
  });
  
  let riskLevel = 'low';
  let recommendations = [];
  
  if (score >= 6) {
    riskLevel = 'high';
    recommendations = [
      'Consult with a gynecologist immediately',
      'Consider hormonal testing',
      'Maintain a healthy diet and exercise routine',
      'Monitor weight and blood sugar levels',
      'Consider stress management techniques'
    ];
  } else if (score >= 3) {
    riskLevel = 'moderate';
    recommendations = [
      'Schedule a consultation with a healthcare provider',
      'Track your symptoms regularly',
      'Maintain a balanced diet',
      'Regular exercise can help manage symptoms',
      'Monitor your menstrual cycle closely'
    ];
  } else {
    riskLevel = 'low';
    recommendations = [
      'Continue monitoring your health',
      'Maintain a healthy lifestyle',
      'Regular check-ups with your healthcare provider',
      'Keep tracking your menstrual cycle'
    ];
  }
  
  return { score, riskLevel, recommendations };
};

module.exports = mongoose.model('PeriodTracker', periodTrackerSchema);