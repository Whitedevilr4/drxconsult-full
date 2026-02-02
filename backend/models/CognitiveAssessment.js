const mongoose = require('mongoose');

const eyeTestResultSchema = new mongoose.Schema({
  colorShown: { type: String, required: true },
  userAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  responseTime: { type: Number, required: true } // milliseconds
});

const brainTestResultSchema = new mongoose.Schema({
  numbersShown: [{ type: Number, required: true }],
  userAnswer: [{ type: Number, required: true }],
  correctCount: { type: Number, required: true },
  responseTime: { type: Number, required: true } // milliseconds
});

const cognitiveAssessmentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { type: Date, default: Date.now },
  eyeTest: {
    results: [eyeTestResultSchema],
    totalCorrect: { type: Number, required: true },
    totalQuestions: { type: Number, default: 5 },
    averageResponseTime: { type: Number, required: true },
    score: { type: Number, required: true } // percentage
  },
  brainTest: {
    results: [brainTestResultSchema],
    totalCorrect: { type: Number, required: true },
    totalQuestions: { type: Number, default: 3 },
    averageResponseTime: { type: Number, required: true },
    score: { type: Number, required: true } // percentage
  },
  overallScore: { type: Number, required: true },
  insights: {
    eyeHealth: { type: String, required: true },
    memoryFunction: { type: String, required: true },
    cognitiveStatus: { type: String, required: true },
    recommendations: [{ type: String }]
  }
});

// Method to analyze cognitive performance
cognitiveAssessmentSchema.methods.generateInsights = function() {
  const eyeScore = this.eyeTest.score;
  const brainScore = this.brainTest.score;
  const eyeResponseTime = this.eyeTest.averageResponseTime;
  const brainResponseTime = this.brainTest.averageResponseTime;
  
  let eyeHealth, memoryFunction, cognitiveStatus;
  const recommendations = [];
  
  // Eye health analysis
  if (eyeScore >= 80 && eyeResponseTime <= 3000) {
    eyeHealth = 'Excellent color recognition and visual processing';
  } else if (eyeScore >= 60 && eyeResponseTime <= 5000) {
    eyeHealth = 'Good color recognition with normal response time';
  } else if (eyeScore >= 40) {
    eyeHealth = 'Moderate color recognition - consider eye check-up';
    recommendations.push('Schedule a comprehensive eye examination');
  } else {
    eyeHealth = 'Poor color recognition - eye examination recommended';
    recommendations.push('Consult an ophthalmologist for detailed eye assessment');
  }
  
  // Memory function analysis
  if (brainScore >= 80 && brainResponseTime <= 10000) {
    memoryFunction = 'Excellent short-term memory and recall ability';
  } else if (brainScore >= 60 && brainResponseTime <= 15000) {
    memoryFunction = 'Good memory function with adequate processing speed';
  } else if (brainScore >= 40) {
    memoryFunction = 'Moderate memory performance - practice memory exercises';
    recommendations.push('Engage in daily memory training exercises');
    recommendations.push('Ensure adequate sleep (7-9 hours) for memory consolidation');
  } else {
    memoryFunction = 'Below average memory performance - consider consultation';
    recommendations.push('Consult a healthcare provider for memory assessment');
    recommendations.push('Practice brain training games and puzzles');
  }
  
  // Overall cognitive status
  const overallScore = (eyeScore + brainScore) / 2;
  if (overallScore >= 80) {
    cognitiveStatus = 'Excellent cognitive function';
  } else if (overallScore >= 60) {
    cognitiveStatus = 'Good cognitive function';
  } else if (overallScore >= 40) {
    cognitiveStatus = 'Moderate cognitive function - room for improvement';
    recommendations.push('Maintain regular physical exercise for brain health');
    recommendations.push('Follow a balanced diet rich in omega-3 fatty acids');
  } else {
    cognitiveStatus = 'Below average cognitive function - professional consultation recommended';
    recommendations.push('Schedule a comprehensive cognitive assessment');
    recommendations.push('Discuss results with your healthcare provider');
  }
  
  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Continue regular cognitive exercises to maintain performance');
    recommendations.push('Maintain a healthy lifestyle with regular exercise and balanced diet');
  }
  
  this.insights = {
    eyeHealth,
    memoryFunction,
    cognitiveStatus,
    recommendations
  };
  
  this.overallScore = Math.round(overallScore);
};

// Call generateInsights before validation
cognitiveAssessmentSchema.pre('validate', function() {
  if (this.isNew || this.isModified('eyeTest') || this.isModified('brainTest')) {
    this.generateInsights();
  }
});

module.exports = mongoose.model('CognitiveAssessment', cognitiveAssessmentSchema);