const mongoose = require('mongoose');

const moodEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  overallMood: {
    type: String,
    enum: ['very_sad', 'sad', 'neutral', 'happy', 'very_happy'],
    required: true
  },
  energyLevel: {
    type: String,
    enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
    required: true
  },
  stressLevel: {
    type: String,
    enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
    required: true
  },
  anxietyLevel: {
    type: String,
    enum: ['none', 'mild', 'moderate', 'high', 'severe'],
    required: true
  },
  sleepQuality: {
    type: String,
    enum: ['very_poor', 'poor', 'fair', 'good', 'excellent'],
    required: true
  },
  socialInteraction: {
    type: String,
    enum: ['none', 'minimal', 'moderate', 'active', 'very_active'],
    required: true
  },
  physicalActivity: {
    type: String,
    enum: ['none', 'light', 'moderate', 'intense', 'very_intense'],
    required: true
  },
  symptoms: [{
    type: String,
    enum: [
      'headache', 'fatigue', 'irritability', 'difficulty_concentrating',
      'appetite_changes', 'mood_swings', 'crying_spells', 'withdrawal',
      'restlessness', 'hopelessness', 'guilt', 'worthlessness'
    ]
  }],
  triggers: [{
    type: String,
    enum: [
      'work_stress', 'relationship_issues', 'financial_concerns', 'health_issues',
      'family_problems', 'social_situations', 'weather', 'hormonal_changes',
      'lack_of_sleep', 'poor_diet', 'alcohol', 'medication_changes'
    ]
  }],
  copingStrategies: [{
    type: String,
    enum: [
      'exercise', 'meditation', 'deep_breathing', 'journaling', 'music',
      'talking_to_friends', 'professional_help', 'hobbies', 'nature',
      'reading', 'creative_activities', 'relaxation_techniques'
    ]
  }],
  notes: {
    type: String,
    maxlength: 1000
  }
});

const moodTrackerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entries: [moodEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

moodTrackerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('MoodTracker', moodTrackerSchema);