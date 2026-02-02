const mongoose = require('mongoose');

const exerciseEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  exerciseType: { 
    type: String, 
    required: true,
    enum: ['walking', 'running', 'cycling', 'swimming', 'yoga', 'gym_workout', 'dancing', 'sports', 'stairs', 'household_chores', 'other']
  },
  duration: { type: Number, required: true }, // minutes
  intensity: { 
    type: String, 
    required: true,
    enum: ['low', 'moderate', 'high', 'very_high']
  },
  steps: { type: Number, default: 0 },
  caloriesBurned: { type: Number, required: true },
  notes: { type: String, maxlength: 500 }
});

const exerciseTrackerSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  userProfile: {
    age: { type: Number, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    weight: { type: Number, required: true }, // kg
    height: { type: Number, required: true }, // cm
    fitnessLevel: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true 
    },
    dailyStepGoal: { type: Number, default: 10000 },
    dailyCalorieGoal: { type: Number, default: 300 } // calories to burn
  },
  exercises: [exerciseEntrySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Method to calculate daily exercise summary
exerciseTrackerSchema.methods.getDailySummary = function(date) {
  const targetDate = new Date(date);
  const dayStart = new Date(targetDate.setHours(0, 0, 0, 0));
  const dayEnd = new Date(targetDate.setHours(23, 59, 59, 999));
  
  const dayExercises = this.exercises.filter(exercise => {
    const exerciseDate = new Date(exercise.date);
    return exerciseDate >= dayStart && exerciseDate <= dayEnd;
  });
  
  const summary = {
    totalSteps: 0,
    totalDuration: 0,
    totalCalories: 0,
    exerciseCount: dayExercises.length,
    exerciseTypes: {},
    intensityBreakdown: { low: 0, moderate: 0, high: 0, very_high: 0 }
  };
  
  dayExercises.forEach(exercise => {
    summary.totalSteps += exercise.steps;
    summary.totalDuration += exercise.duration;
    summary.totalCalories += exercise.caloriesBurned;
    
    // Count exercise types
    if (summary.exerciseTypes[exercise.exerciseType]) {
      summary.exerciseTypes[exercise.exerciseType] += exercise.duration;
    } else {
      summary.exerciseTypes[exercise.exerciseType] = exercise.duration;
    }
    
    // Count intensity levels
    summary.intensityBreakdown[exercise.intensity] += exercise.duration;
  });
  
  // Calculate goals achievement
  const stepGoalAchievement = Math.round((summary.totalSteps / this.userProfile.dailyStepGoal) * 100);
  const calorieGoalAchievement = Math.round((summary.totalCalories / this.userProfile.dailyCalorieGoal) * 100);
  
  return {
    date: targetDate.toISOString().split('T')[0],
    summary,
    goals: {
      steps: this.userProfile.dailyStepGoal,
      calories: this.userProfile.dailyCalorieGoal
    },
    achievement: {
      steps: stepGoalAchievement,
      calories: calorieGoalAchievement
    },
    insights: this.generateInsights(summary, stepGoalAchievement, calorieGoalAchievement)
  };
};

// Method to generate health insights
exerciseTrackerSchema.methods.generateInsights = function(summary, stepGoal, calorieGoal) {
  const insights = [];
  const recommendations = [];
  
  // Step analysis
  if (stepGoal >= 100) {
    insights.push('Excellent! You exceeded your daily step goal');
  } else if (stepGoal >= 80) {
    insights.push('Great job! You\'re close to your step goal');
  } else if (stepGoal >= 50) {
    recommendations.push('Try to add more walking throughout the day');
  } else {
    recommendations.push('Consider taking short walks every hour');
  }
  
  // Calorie burn analysis
  if (calorieGoal >= 100) {
    insights.push('Outstanding calorie burn today!');
  } else if (calorieGoal >= 80) {
    insights.push('Good calorie burn, keep it up!');
  } else {
    recommendations.push('Try adding 15-20 minutes of moderate exercise');
  }
  
  // Duration analysis
  if (summary.totalDuration >= 60) {
    insights.push('You met the recommended 60 minutes of daily activity');
  } else if (summary.totalDuration >= 30) {
    insights.push('Good activity level, aim for 60 minutes daily');
  } else if (summary.totalDuration > 0) {
    recommendations.push('Try to increase exercise duration gradually');
  } else {
    recommendations.push('Start with 10-15 minutes of light exercise');
  }
  
  // Variety analysis
  const exerciseTypeCount = Object.keys(summary.exerciseTypes).length;
  if (exerciseTypeCount >= 3) {
    insights.push('Great variety in your exercise routine!');
  } else if (exerciseTypeCount === 2) {
    recommendations.push('Consider adding one more type of exercise for variety');
  } else if (exerciseTypeCount === 1) {
    recommendations.push('Mix different types of exercises for better results');
  }
  
  return { insights, recommendations };
};

exerciseTrackerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('ExerciseTracker', exerciseTrackerSchema);