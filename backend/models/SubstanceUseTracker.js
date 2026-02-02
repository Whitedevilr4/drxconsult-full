const mongoose = require('mongoose');

const substanceEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  smoking: {
    cigarettes: {
      type: Number,
      default: 0
    },
    cigars: {
      type: Number,
      default: 0
    },
    vaping: {
      sessions: {
        type: Number,
        default: 0
      },
      nicotineStrength: {
        type: String,
        enum: ['none', 'low', 'medium', 'high'],
        default: 'none'
      }
    },
    other: {
      type: String,
      default: ''
    }
  },
  alcohol: {
    beer: {
      type: Number,
      default: 0 // number of drinks
    },
    wine: {
      type: Number,
      default: 0 // number of glasses
    },
    spirits: {
      type: Number,
      default: 0 // number of shots/drinks
    },
    other: {
      type: String,
      default: ''
    }
  },
  triggers: [{
    type: String,
    enum: [
      'stress', 'social_situation', 'boredom', 'habit', 'celebration',
      'work_pressure', 'relationship_issues', 'anxiety', 'depression',
      'peer_pressure', 'after_meals', 'with_coffee', 'driving', 'other'
    ]
  }],
  mood: {
    type: String,
    enum: ['very_bad', 'bad', 'neutral', 'good', 'very_good'],
    required: true
  },
  cravingLevel: {
    type: String,
    enum: ['none', 'mild', 'moderate', 'strong', 'overwhelming'],
    required: true
  },
  location: {
    type: String,
    enum: ['home', 'work', 'bar', 'restaurant', 'party', 'outdoors', 'car', 'other'],
    default: 'home'
  },
  withOthers: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    maxlength: 500
  }
});

const substanceUseTrackerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userProfile: {
    age: {
      type: Number,
      required: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true
    },
    weight: {
      type: Number, // in kg
      default: 70
    },
    smokingHistory: {
      yearsSmoked: {
        type: Number,
        default: 0
      },
      previousAttempts: {
        type: Number,
        default: 0
      },
      wantsToQuit: {
        type: Boolean,
        default: false
      }
    },
    drinkingHistory: {
      yearsOfDrinking: {
        type: Number,
        default: 0
      },
      familyHistory: {
        type: Boolean,
        default: false
      },
      wantsToReduce: {
        type: Boolean,
        default: false
      }
    }
  },
  entries: [substanceEntrySchema],
  quitAttempts: [{
    startDate: Date,
    endDate: Date,
    substance: {
      type: String,
      enum: ['smoking', 'alcohol', 'both']
    },
    reason: String,
    successful: Boolean,
    notes: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Method to generate comprehensive risk analysis
substanceUseTrackerSchema.methods.generateRiskAnalysis = function() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
  // Get recent entries
  const recentEntries = this.entries.filter(entry => 
    new Date(entry.date) >= thirtyDaysAgo
  );
  
  const weeklyEntries = this.entries.filter(entry => 
    new Date(entry.date) >= sevenDaysAgo
  );
  
  // Smoking analysis
  const totalCigarettes = recentEntries.reduce((sum, entry) => 
    sum + (entry.smoking.cigarettes || 0), 0
  );
  const avgCigarettesPerDay = recentEntries.length > 0 ? 
    Math.round(totalCigarettes / Math.min(30, recentEntries.length)) : 0;
  
  const totalVapingSessions = recentEntries.reduce((sum, entry) => 
    sum + (entry.smoking.vaping.sessions || 0), 0
  );
  
  // Alcohol analysis
  const totalAlcoholUnits = recentEntries.reduce((sum, entry) => {
    const beer = (entry.alcohol.beer || 0) * 1.5; // 1 beer = ~1.5 units
    const wine = (entry.alcohol.wine || 0) * 1.5; // 1 glass wine = ~1.5 units
    const spirits = (entry.alcohol.spirits || 0) * 1; // 1 shot = ~1 unit
    return sum + beer + wine + spirits;
  }, 0);
  
  const avgAlcoholUnitsPerWeek = recentEntries.length > 0 ? 
    Math.round((totalAlcoholUnits / Math.min(30, recentEntries.length)) * 7) : 0;
  
  // Risk scoring
  let smokingRisk = 0;
  let alcoholRisk = 0;
  
  // Smoking risk factors
  if (avgCigarettesPerDay > 20) smokingRisk += 4;
  else if (avgCigarettesPerDay > 10) smokingRisk += 3;
  else if (avgCigarettesPerDay > 5) smokingRisk += 2;
  else if (avgCigarettesPerDay > 0) smokingRisk += 1;
  
  if (totalVapingSessions > 30) smokingRisk += 2;
  else if (totalVapingSessions > 0) smokingRisk += 1;
  
  if (this.userProfile.smokingHistory.yearsSmoked > 10) smokingRisk += 2;
  else if (this.userProfile.smokingHistory.yearsSmoked > 5) smokingRisk += 1;
  
  // Alcohol risk factors
  if (avgAlcoholUnitsPerWeek > 21) alcoholRisk += 4; // Heavy drinking
  else if (avgAlcoholUnitsPerWeek > 14) alcoholRisk += 3; // Above recommended
  else if (avgAlcoholUnitsPerWeek > 7) alcoholRisk += 2; // Moderate
  else if (avgAlcoholUnitsPerWeek > 0) alcoholRisk += 1; // Light
  
  if (this.userProfile.drinkingHistory.familyHistory) alcoholRisk += 1;
  if (this.userProfile.drinkingHistory.yearsOfDrinking > 10) alcoholRisk += 1;
  
  // Binge drinking detection
  const bingeDays = recentEntries.filter(entry => {
    const dailyUnits = (entry.alcohol.beer || 0) * 1.5 + 
                     (entry.alcohol.wine || 0) * 1.5 + 
                     (entry.alcohol.spirits || 0) * 1;
    return dailyUnits > 6; // Binge threshold
  }).length;
  
  if (bingeDays > 4) alcoholRisk += 3;
  else if (bingeDays > 0) alcoholRisk += 1;
  
  // Overall risk assessment
  const combinedRisk = Math.max(smokingRisk, alcoholRisk);
  let overallRiskLevel = 'Low';
  let riskColor = 'text-green-600';
  let riskBg = 'bg-green-50';
  
  if (combinedRisk >= 6) {
    overallRiskLevel = 'High';
    riskColor = 'text-red-600';
    riskBg = 'bg-red-50';
  } else if (combinedRisk >= 3) {
    overallRiskLevel = 'Moderate';
    riskColor = 'text-orange-600';
    riskBg = 'bg-orange-50';
  }
  
  // Generate recommendations
  const recommendations = [];
  const healthWarnings = [];
  const quitStrategies = [];
  
  // Smoking recommendations
  if (smokingRisk > 0) {
    healthWarnings.push('🚭 Smoking significantly increases risk of cancer, heart disease, and stroke');
    healthWarnings.push('🫁 Every cigarette damages your lungs and reduces life expectancy');
    
    if (smokingRisk >= 3) {
      recommendations.push('Seek immediate help from a smoking cessation program');
      recommendations.push('Consider nicotine replacement therapy (patches, gum, lozenges)');
      recommendations.push('Consult your doctor about prescription quit-smoking medications');
      quitStrategies.push('Set a quit date within the next 2 weeks');
      quitStrategies.push('Remove all smoking materials from your environment');
      quitStrategies.push('Identify and avoid your smoking triggers');
    } else {
      recommendations.push('Consider reducing cigarettes gradually');
      recommendations.push('Try nicotine replacement products');
      quitStrategies.push('Start with smoke-free hours, then extend to full days');
      quitStrategies.push('Find healthy alternatives for stress relief');
    }
    
    quitStrategies.push('Join a support group or online community');
    quitStrategies.push('Practice deep breathing exercises when cravings hit');
    quitStrategies.push('Keep your hands and mouth busy with healthy alternatives');
  }
  
  // Alcohol recommendations
  if (alcoholRisk > 0) {
    healthWarnings.push('🍺 Excessive alcohol consumption increases risk of liver disease, cancer, and addiction');
    healthWarnings.push('🧠 Alcohol affects brain function and can lead to dependency');
    
    if (alcoholRisk >= 3) {
      recommendations.push('Consider professional alcohol counseling or treatment');
      recommendations.push('Consult your doctor about alcohol reduction strategies');
      recommendations.push('Avoid situations that trigger heavy drinking');
      quitStrategies.push('Set alcohol-free days each week');
      quitStrategies.push('Replace alcoholic drinks with non-alcoholic alternatives');
    } else {
      recommendations.push('Stay within recommended weekly alcohol limits');
      recommendations.push('Have alcohol-free days each week');
      quitStrategies.push('Alternate alcoholic drinks with water');
      quitStrategies.push('Eat before and while drinking');
    }
    
    quitStrategies.push('Find social activities that don\'t involve alcohol');
    quitStrategies.push('Practice stress management techniques');
    quitStrategies.push('Track your drinking to stay aware of consumption');
  }
  
  // Trigger analysis
  const triggerCounts = {};
  recentEntries.forEach(entry => {
    (entry.triggers || []).forEach(trigger => {
      triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
    });
  });
  
  const topTriggers = Object.entries(triggerCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([trigger]) => trigger);
  
  // Health benefits of quitting
  const healthBenefits = [];
  if (smokingRisk > 0) {
    healthBenefits.push('Within 20 minutes: Heart rate and blood pressure drop');
    healthBenefits.push('Within 12 hours: Carbon monoxide levels normalize');
    healthBenefits.push('Within 2 weeks: Circulation improves and lung function increases');
    healthBenefits.push('Within 1 year: Risk of heart disease is cut in half');
  }
  
  if (alcoholRisk > 0) {
    healthBenefits.push('Better sleep quality and energy levels');
    healthBenefits.push('Improved liver function and overall health');
    healthBenefits.push('Better mental clarity and mood stability');
    healthBenefits.push('Reduced risk of accidents and injuries');
  }
  
  return {
    overallRiskLevel,
    riskColor,
    riskBg,
    smokingRisk,
    alcoholRisk,
    avgCigarettesPerDay,
    totalVapingSessions,
    avgAlcoholUnitsPerWeek,
    bingeDays,
    topTriggers,
    recommendations,
    healthWarnings,
    quitStrategies,
    healthBenefits,
    daysAnalyzed: Math.min(30, recentEntries.length),
    weeklyEntries: weeklyEntries.length
  };
};

substanceUseTrackerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('SubstanceUseTracker', substanceUseTrackerSchema);