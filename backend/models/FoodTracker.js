const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  calories: { type: Number, required: true },
  carbs: { type: Number, required: true }, // grams
  protein: { type: Number, required: true }, // grams
  fat: { type: Number, required: true }, // grams
  fiber: { type: Number, default: 0 }, // grams
  sugar: { type: Number, default: 0 }, // grams
  sodium: { type: Number, default: 0 }, // mg
  cholesterol: { type: Number, default: 0 }, // mg
  servingSize: { type: String, required: true },
  healthScore: { type: Number, min: 1, max: 10, default: 5 } // 1-10 scale
});

const mealEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  mealType: { 
    type: String, 
    required: true, 
    enum: ['breakfast', 'lunch', 'dinner', 'snack'] 
  },
  foods: [{
    foodItem: { type: String, required: true }, // food name
    quantity: { type: Number, required: true, default: 1 },
    calories: { type: Number, required: true },
    carbs: { type: Number, required: true },
    protein: { type: Number, required: true },
    fat: { type: Number, required: true },
    fiber: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },
    cholesterol: { type: Number, default: 0 }
  }],
  totalCalories: { type: Number, required: true },
  totalCarbs: { type: Number, required: true },
  totalProtein: { type: Number, required: true },
  totalFat: { type: Number, required: true },
  totalFiber: { type: Number, default: 0 },
  totalSugar: { type: Number, default: 0 },
  totalSodium: { type: Number, default: 0 },
  totalCholesterol: { type: Number, default: 0 },
  notes: { type: String, maxlength: 500 }
});

const foodTrackerSchema = new mongoose.Schema({
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
    activityLevel: { 
      type: String, 
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'],
      required: true 
    },
    dietaryGoal: {
      type: String,
      enum: ['weight_loss', 'weight_gain', 'maintain_weight', 'muscle_gain', 'general_health'],
      required: true
    },
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'jain', 'gluten_free', 'dairy_free', 'nut_free', 'low_sodium', 'diabetic', 'low_spice', 'no_onion_garlic']
    }],
    dailyCalorieGoal: { type: Number, required: true },
    dailyCarbGoal: { type: Number, required: true }, // grams
    dailyProteinGoal: { type: Number, required: true }, // grams
    dailyFatGoal: { type: Number, required: true } // grams
  },
  meals: [mealEntrySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Method to calculate daily nutritional analysis
foodTrackerSchema.methods.getDailyAnalysis = function(date) {
  const targetDate = new Date(date);
  const dayStart = new Date(targetDate.setHours(0, 0, 0, 0));
  const dayEnd = new Date(targetDate.setHours(23, 59, 59, 999));
  
  const dayMeals = this.meals.filter(meal => {
    const mealDate = new Date(meal.date);
    return mealDate >= dayStart && mealDate <= dayEnd;
  });
  
  const totals = {
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    cholesterol: 0,
    meals: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  };
  
  dayMeals.forEach(meal => {
    totals.calories += meal.totalCalories;
    totals.carbs += meal.totalCarbs;
    totals.protein += meal.totalProtein;
    totals.fat += meal.totalFat;
    totals.fiber += meal.totalFiber;
    totals.sugar += meal.totalSugar;
    totals.sodium += meal.totalSodium;
    totals.cholesterol += meal.totalCholesterol;
    totals.meals[meal.mealType] += meal.totalCalories;
  });
  
  // Calculate percentages of daily goals
  const goals = this.userProfile;
  const analysis = {
    date: targetDate.toISOString().split('T')[0],
    totals,
    goals: {
      calories: goals.dailyCalorieGoal,
      carbs: goals.dailyCarbGoal,
      protein: goals.dailyProteinGoal,
      fat: goals.dailyFatGoal
    },
    percentages: {
      calories: Math.round((totals.calories / goals.dailyCalorieGoal) * 100),
      carbs: Math.round((totals.carbs / goals.dailyCarbGoal) * 100),
      protein: Math.round((totals.protein / goals.dailyProteinGoal) * 100),
      fat: Math.round((totals.fat / goals.dailyFatGoal) * 100)
    },
    mealBreakdown: totals.meals,
    insights: [],
    warnings: [],
    recommendations: []
  };
  
  // Generate insights and recommendations
  if (analysis.percentages.calories > 120) {
    analysis.warnings.push('Daily calorie intake is significantly above target');
    analysis.recommendations.push('Consider reducing portion sizes or choosing lower-calorie alternatives');
  } else if (analysis.percentages.calories < 80) {
    analysis.warnings.push('Daily calorie intake is below recommended target');
    analysis.recommendations.push('Consider adding healthy snacks or increasing portion sizes');
  } else {
    analysis.insights.push('Calorie intake is within healthy range');
  }
  
  if (analysis.percentages.carbs > 130) {
    analysis.warnings.push('High carbohydrate intake detected');
    analysis.recommendations.push('Consider reducing refined carbs and increasing protein/fiber');
  }
  
  if (totals.sugar > 50) { // WHO recommendation: <50g added sugar
    analysis.warnings.push(`High sugar intake: ${Math.round(totals.sugar)}g (recommended: <50g)`);
    analysis.recommendations.push('Reduce sugary drinks, desserts, and processed foods');
  }
  
  if (totals.sodium > 2300) { // FDA recommendation: <2300mg
    analysis.warnings.push(`High sodium intake: ${Math.round(totals.sodium)}mg (recommended: <2300mg)`);
    analysis.recommendations.push('Choose low-sodium alternatives and avoid processed foods');
  }
  
  if (analysis.percentages.protein < 80) {
    analysis.warnings.push('Protein intake below recommended target');
    analysis.recommendations.push('Include more lean meats, fish, eggs, legumes, or dairy');
  } else if (analysis.percentages.protein >= 100) {
    analysis.insights.push('Good protein intake for muscle maintenance and satiety');
  }
  
  if (totals.fiber < 25) { // Recommended: 25-35g daily
    analysis.warnings.push(`Low fiber intake: ${Math.round(totals.fiber)}g (recommended: 25-35g)`);
    analysis.recommendations.push('Add more fruits, vegetables, whole grains, and legumes');
  } else {
    analysis.insights.push('Good fiber intake for digestive health');
  }
  
  // Meal distribution analysis
  const totalMealCalories = Object.values(totals.meals).reduce((sum, cal) => sum + cal, 0);
  if (totalMealCalories > 0) {
    const breakfastPercent = (totals.meals.breakfast / totalMealCalories) * 100;
    const lunchPercent = (totals.meals.lunch / totalMealCalories) * 100;
    const dinnerPercent = (totals.meals.dinner / totalMealCalories) * 100;
    
    if (breakfastPercent < 20) {
      analysis.recommendations.push('Consider having a more substantial breakfast (20-25% of daily calories)');
    }
    if (dinnerPercent > 40) {
      analysis.recommendations.push('Try to have a lighter dinner and distribute calories more evenly throughout the day');
    }
  }
  
  return analysis;
};

// Method to get weekly nutrition trends
foodTrackerSchema.methods.getWeeklyTrends = function() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
  const weekMeals = this.meals.filter(meal => 
    new Date(meal.date) >= weekAgo && new Date(meal.date) <= now
  );
  
  const dailyTotals = {};
  
  weekMeals.forEach(meal => {
    const dateKey = meal.date.toISOString().split('T')[0];
    if (!dailyTotals[dateKey]) {
      dailyTotals[dateKey] = {
        calories: 0, carbs: 0, protein: 0, fat: 0, 
        fiber: 0, sugar: 0, sodium: 0, cholesterol: 0
      };
    }
    
    dailyTotals[dateKey].calories += meal.totalCalories;
    dailyTotals[dateKey].carbs += meal.totalCarbs;
    dailyTotals[dateKey].protein += meal.totalProtein;
    dailyTotals[dateKey].fat += meal.totalFat;
    dailyTotals[dateKey].fiber += meal.totalFiber;
    dailyTotals[dateKey].sugar += meal.totalSugar;
    dailyTotals[dateKey].sodium += meal.totalSodium;
    dailyTotals[dateKey].cholesterol += meal.totalCholesterol;
  });
  
  const days = Object.keys(dailyTotals);
  if (days.length === 0) return null;
  
  const averages = {
    calories: 0, carbs: 0, protein: 0, fat: 0,
    fiber: 0, sugar: 0, sodium: 0, cholesterol: 0
  };
  
  days.forEach(day => {
    Object.keys(averages).forEach(nutrient => {
      averages[nutrient] += dailyTotals[day][nutrient];
    });
  });
  
  Object.keys(averages).forEach(nutrient => {
    averages[nutrient] = Math.round(averages[nutrient] / days.length);
  });
  
  return {
    period: `${days.length} days`,
    averages,
    dailyData: dailyTotals,
    trends: {
      calories: this.calculateTrend(dailyTotals, 'calories'),
      carbs: this.calculateTrend(dailyTotals, 'carbs'),
      protein: this.calculateTrend(dailyTotals, 'protein'),
      fat: this.calculateTrend(dailyTotals, 'fat')
    }
  };
};

// Helper method to calculate trend direction
foodTrackerSchema.methods.calculateTrend = function(dailyData, nutrient) {
  const days = Object.keys(dailyData).sort();
  if (days.length < 3) return 'stable';
  
  const firstHalf = days.slice(0, Math.floor(days.length / 2));
  const secondHalf = days.slice(Math.ceil(days.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, day) => sum + dailyData[day][nutrient], 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, day) => sum + dailyData[day][nutrient], 0) / secondHalf.length;
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (change > 10) return 'increasing';
  if (change < -10) return 'decreasing';
  return 'stable';
};

foodTrackerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('FoodTracker', foodTrackerSchema);