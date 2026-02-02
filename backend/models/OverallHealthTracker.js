const mongoose = require('mongoose');

const symptomEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  symptoms: {
    headache: {
      severity: {
        type: String,
        enum: ['none', 'mild', 'moderate', 'severe'],
        default: 'none'
      },
      duration: {
        type: Number, // in hours
        default: 0
      },
      type: {
        type: String,
        enum: ['tension', 'migraine', 'cluster', 'sinus', 'other'],
        default: 'tension'
      }
    },
    runnyNose: {
      severity: {
        type: String,
        enum: ['none', 'mild', 'moderate', 'severe'],
        default: 'none'
      },
      color: {
        type: String,
        enum: ['clear', 'yellow', 'green', 'bloody'],
        default: 'clear'
      }
    },
    sneezing: {
      severity: {
        type: String,
        enum: ['none', 'mild', 'moderate', 'severe'],
        default: 'none'
      },
      frequency: {
        type: String,
        enum: ['occasional', 'frequent', 'constant'],
        default: 'occasional'
      }
    },
    coughing: {
      severity: {
        type: String,
        enum: ['none', 'mild', 'moderate', 'severe'],
        default: 'none'
      },
      type: {
        type: String,
        enum: ['dry', 'productive', 'barking', 'whooping'],
        default: 'dry'
      },
      duration: {
        type: Number, // in days
        default: 0
      }
    },
    fever: {
      temperature: {
        type: Number, // in Fahrenheit
        default: 0
      },
      duration: {
        type: Number, // in hours
        default: 0
      },
      pattern: {
        type: String,
        enum: ['continuous', 'intermittent', 'remittent'],
        default: 'continuous'
      }
    },
    pain: {
      severity: {
        type: String,
        enum: ['none', 'mild', 'moderate', 'severe'],
        default: 'none'
      },
      location: [{
        type: String,
        enum: ['head', 'neck', 'chest', 'back', 'abdomen', 'arms', 'legs', 'joints', 'muscles', 'throat', 'other']
      }],
      type: {
        type: String,
        enum: ['sharp', 'dull', 'throbbing', 'burning', 'cramping', 'stabbing'],
        default: 'dull'
      }
    }
  },
  overallWellbeing: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'very_poor'],
    required: true
  },
  energyLevel: {
    type: String,
    enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
    required: true
  },
  sleepQuality: {
    type: String,
    enum: ['very_poor', 'poor', 'fair', 'good', 'excellent'],
    required: true
  },
  appetiteLevel: {
    type: String,
    enum: ['very_poor', 'poor', 'normal', 'good', 'excessive'],
    required: true
  },
  stressLevel: {
    type: String,
    enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
    required: true
  },
  hydrationLevel: {
    type: String,
    enum: ['very_low', 'low', 'adequate', 'good', 'excellent'],
    required: true
  },
  additionalSymptoms: [{
    type: String,
    enum: [
      'nausea', 'vomiting', 'diarrhea', 'constipation', 'dizziness', 'fatigue',
      'chills', 'sweating', 'shortness_of_breath', 'chest_tightness', 'rash',
      'itching', 'swelling', 'muscle_aches', 'joint_stiffness', 'confusion',
      'irritability', 'loss_of_taste', 'loss_of_smell', 'sore_throat'
    ]
  }],
  triggers: [{
    type: String,
    enum: [
      'weather_change', 'stress', 'lack_of_sleep', 'poor_diet', 'dehydration',
      'allergens', 'pollution', 'exercise', 'medication', 'alcohol', 'smoking',
      'travel', 'work_environment', 'seasonal_change', 'hormonal_change'
    ]
  }],
  remediesTried: [{
    type: String,
    enum: [
      'rest', 'hydration', 'pain_medication', 'cold_compress', 'warm_compress',
      'steam_inhalation', 'saltwater_gargle', 'honey', 'ginger_tea', 'herbal_tea',
      'vitamin_c', 'throat_lozenges', 'nasal_spray', 'humidifier', 'essential_oils'
    ]
  }],
  notes: {
    type: String,
    maxlength: 1000
  }
});

const overallHealthTrackerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entries: [symptomEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

overallHealthTrackerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Method to generate remedy recommendations
overallHealthTrackerSchema.methods.generateRemedyRecommendations = function(entry) {
  const recommendations = {
    immediate: [],
    homeRemedies: [],
    lifestyle: [],
    whenToSeekHelp: [],
    medications: [],
    prevention: []
  };

  const symptoms = entry.symptoms;
  
  // Fever recommendations
  if (symptoms.fever.temperature > 100.4) {
    if (symptoms.fever.temperature > 103) {
      recommendations.whenToSeekHelp.push('Seek immediate medical attention for high fever (>103°F)');
      recommendations.immediate.push('Apply cool compresses to forehead and wrists');
      recommendations.immediate.push('Take fever-reducing medication as directed');
    } else {
      recommendations.homeRemedies.push('Stay hydrated with water, clear broths, or electrolyte solutions');
      recommendations.homeRemedies.push('Rest in a cool, comfortable environment');
      recommendations.medications.push('Consider acetaminophen or ibuprofen for fever reduction');
    }
  }

  // Headache recommendations
  if (symptoms.headache.severity !== 'none') {
    if (symptoms.headache.severity === 'severe') {
      recommendations.whenToSeekHelp.push('Consult doctor for severe or persistent headaches');
    }
    
    if (symptoms.headache.type === 'tension') {
      recommendations.homeRemedies.push('Apply cold or warm compress to head/neck');
      recommendations.homeRemedies.push('Practice relaxation techniques and deep breathing');
      recommendations.lifestyle.push('Maintain regular sleep schedule');
    } else if (symptoms.headache.type === 'migraine') {
      recommendations.immediate.push('Rest in a dark, quiet room');
      recommendations.homeRemedies.push('Apply cold compress to forehead');
      recommendations.lifestyle.push('Identify and avoid migraine triggers');
    }
    
    recommendations.medications.push('Over-the-counter pain relievers (acetaminophen, ibuprofen)');
    recommendations.prevention.push('Stay hydrated and maintain regular meals');
  }

  // Runny nose and sneezing recommendations
  if (symptoms.runnyNose.severity !== 'none' || symptoms.sneezing.severity !== 'none') {
    recommendations.homeRemedies.push('Use saline nasal rinse or spray');
    recommendations.homeRemedies.push('Steam inhalation with hot water');
    recommendations.homeRemedies.push('Use a humidifier to add moisture to air');
    
    if (symptoms.runnyNose.color === 'yellow' || symptoms.runnyNose.color === 'green') {
      recommendations.whenToSeekHelp.push('Consult doctor for colored nasal discharge (possible infection)');
    }
    
    recommendations.medications.push('Antihistamines for allergic symptoms');
    recommendations.medications.push('Decongestants for nasal congestion');
    recommendations.prevention.push('Avoid known allergens and irritants');
  }

  // Coughing recommendations
  if (symptoms.coughing.severity !== 'none') {
    if (symptoms.coughing.duration > 7) {
      recommendations.whenToSeekHelp.push('See doctor for persistent cough lasting more than a week');
    }
    
    if (symptoms.coughing.type === 'dry') {
      recommendations.homeRemedies.push('Honey and warm water for soothing throat');
      recommendations.homeRemedies.push('Throat lozenges or hard candies');
      recommendations.medications.push('Cough suppressants for dry cough');
    } else if (symptoms.coughing.type === 'productive') {
      recommendations.homeRemedies.push('Stay hydrated to thin mucus');
      recommendations.homeRemedies.push('Steam inhalation to loosen congestion');
      recommendations.medications.push('Expectorants to help clear mucus');
    }
    
    recommendations.lifestyle.push('Avoid smoke and other irritants');
    recommendations.prevention.push('Practice good hand hygiene');
  }

  // Pain recommendations
  if (symptoms.pain.severity !== 'none') {
    if (symptoms.pain.severity === 'severe') {
      recommendations.whenToSeekHelp.push('Seek medical attention for severe pain');
    }
    
    if (symptoms.pain.location.includes('chest')) {
      recommendations.whenToSeekHelp.push('Seek immediate medical attention for chest pain');
    }
    
    if (symptoms.pain.type === 'sharp' || symptoms.pain.type === 'stabbing') {
      recommendations.immediate.push('Rest and avoid activities that worsen pain');
    }
    
    recommendations.homeRemedies.push('Apply ice for acute injuries or heat for muscle tension');
    recommendations.medications.push('Anti-inflammatory medications (ibuprofen, naproxen)');
    recommendations.lifestyle.push('Gentle stretching and movement as tolerated');
  }

  // General wellness recommendations
  if (entry.overallWellbeing === 'poor' || entry.overallWellbeing === 'very_poor') {
    recommendations.immediate.push('Prioritize rest and recovery');
    recommendations.lifestyle.push('Focus on nutrition and hydration');
  }

  if (entry.energyLevel === 'very_low' || entry.energyLevel === 'low') {
    recommendations.homeRemedies.push('Ensure adequate sleep (7-9 hours)');
    recommendations.lifestyle.push('Light exercise or gentle movement');
    recommendations.prevention.push('Maintain balanced diet with regular meals');
  }

  // Hydration recommendations
  if (entry.hydrationLevel === 'very_low' || entry.hydrationLevel === 'low') {
    recommendations.immediate.push('Increase fluid intake immediately');
    recommendations.homeRemedies.push('Drink water, herbal teas, or clear broths');
    recommendations.prevention.push('Aim for 8-10 glasses of water daily');
  }

  // Additional symptoms
  if (entry.additionalSymptoms.includes('nausea') || entry.additionalSymptoms.includes('vomiting')) {
    recommendations.homeRemedies.push('Ginger tea or ginger supplements');
    recommendations.homeRemedies.push('Small, frequent meals with bland foods');
    recommendations.immediate.push('Stay hydrated with small sips of clear fluids');
  }

  if (entry.additionalSymptoms.includes('sore_throat')) {
    recommendations.homeRemedies.push('Warm saltwater gargle');
    recommendations.homeRemedies.push('Honey and warm tea');
    recommendations.medications.push('Throat lozenges with menthol or benzocaine');
  }

  // Emergency warning signs
  recommendations.whenToSeekHelp.push('Seek immediate care for: difficulty breathing, chest pain, severe dehydration, high fever with confusion');
  
  return recommendations;
};

overallHealthTrackerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('OverallHealthTracker', overallHealthTrackerSchema);