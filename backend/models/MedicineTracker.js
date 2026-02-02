const mongoose = require('mongoose');

const medicineScheduleSchema = new mongoose.Schema({
  time: {
    type: String,
    required: true // Format: "HH:MM"
  },
  dosage: {
    type: String,
    required: true // e.g., "1 tablet", "5ml", "2 capsules"
  },
  instructions: {
    type: String,
    default: '' // e.g., "with food", "before meals", "at bedtime"
  }
});

const medicineEntrySchema = new mongoose.Schema({
  medicineName: {
    type: String,
    required: true
  },
  medicineType: {
    type: String,
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler', 'other'],
    required: true
  },
  purpose: {
    type: String,
    required: true // What condition/symptom it treats
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDuration: {
    type: Number, // in days
    required: true
  },
  schedule: [medicineScheduleSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  prescribedBy: {
    type: String,
    default: '' // Doctor name
  },
  sideEffects: [{
    type: String,
    enum: [
      'nausea', 'dizziness', 'headache', 'drowsiness', 'stomach_upset',
      'rash', 'fatigue', 'insomnia', 'dry_mouth', 'constipation',
      'diarrhea', 'loss_of_appetite', 'weight_gain', 'weight_loss', 'other'
    ]
  }],
  notes: {
    type: String,
    maxlength: 500
  }
});

const medicineLogSchema = new mongoose.Schema({
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  takenAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['due', 'taken', 'missed', 'skipped'],
    default: 'due'
  },
  actualDosage: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    maxlength: 200
  },
  sideEffectsExperienced: [{
    type: String,
    enum: [
      'nausea', 'dizziness', 'headache', 'drowsiness', 'stomach_upset',
      'rash', 'fatigue', 'insomnia', 'dry_mouth', 'constipation',
      'diarrhea', 'loss_of_appetite', 'weight_gain', 'weight_loss', 'other'
    ]
  }]
});

const medicineTrackerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicines: [medicineEntrySchema],
  medicineLog: [medicineLogSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Method to generate medicine adherence analysis
medicineTrackerSchema.methods.generateAdherenceAnalysis = function() {
  const now = new Date();
  
  // Get active medicines to determine the earliest start date
  const activeMedicines = this.medicines.filter(med => med.isActive);
  if (activeMedicines.length === 0) {
    return {
      riskLevel: 'Low',
      riskColor: 'text-green-600',
      riskBg: 'bg-green-50',
      adherenceRate: 100,
      onTimeRate: 100,
      totalScheduled: 0,
      taken: 0,
      missed: 0,
      skipped: 0,
      activeMedicines: 0,
      expiringSoon: 0,
      recommendations: ['Add your medications to start tracking adherence'],
      warnings: [],
      sideEffectCounts: {},
      daysAnalyzed: 0
    };
  }
  
  // Find the earliest medicine start date (but not more than 30 days ago)
  const earliestStartDate = activeMedicines.reduce((earliest, med) => {
    const startDate = new Date(med.startDate);
    return startDate < earliest ? startDate : earliest;
  }, now);
  
  // Limit analysis to maximum 30 days ago
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const analysisStartDate = earliestStartDate > thirtyDaysAgo ? earliestStartDate : thirtyDaysAgo;
  
  // Get logs from the analysis start date
  const recentLogs = this.medicineLog.filter(log => 
    new Date(log.scheduledDate) >= analysisStartDate
  );
  
  // Only count doses that were actually due (not future doses)
  const dueOrPastLogs = recentLogs.filter(log => {
    const scheduledDate = new Date(log.scheduledDate);
    const [hours, minutes] = log.scheduledTime.split(':').map(Number);
    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const logDate = new Date(scheduledDate);
    logDate.setHours(0, 0, 0, 0);
    
    // Include if it's from a past day, or if it's today and the time has passed, or if it's already taken
    return scheduledDateTime <= now || 
           logDate < today || 
           log.status === 'taken' || 
           log.status === 'missed' || 
           log.status === 'skipped';
  });
  
  const totalScheduled = dueOrPastLogs.length;
  const takenOnTime = dueOrPastLogs.filter(log => {
    if (log.status !== 'taken' || !log.takenAt) return false;
    
    const scheduledDate = new Date(log.scheduledDate);
    const [hours, minutes] = log.scheduledTime.split(':').map(Number);
    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    const takenDateTime = new Date(log.takenAt);
    const timeDiff = Math.abs(takenDateTime - scheduledDateTime) / (1000 * 60); // in minutes
    
    return timeDiff <= 60; // Within 1 hour is considered "on time"
  }).length;
  
  const taken = dueOrPastLogs.filter(log => log.status === 'taken').length;
  const missed = dueOrPastLogs.filter(log => log.status === 'missed').length;
  const skipped = dueOrPastLogs.filter(log => log.status === 'skipped').length;
  
  const adherenceRate = totalScheduled > 0 ? Math.round((taken / totalScheduled) * 100) : 100;
  const onTimeRate = totalScheduled > 0 ? Math.round((takenOnTime / totalScheduled) * 100) : 100;
  
  // Risk assessment
  let riskLevel = 'Low';
  let riskColor = 'text-green-600';
  let riskBg = 'bg-green-50';
  let recommendations = [];
  let warnings = [];
  
  // If there are very few doses to evaluate, be more lenient
  if (totalScheduled < 3) {
    if (taken === totalScheduled && totalScheduled > 0) {
      riskLevel = 'Low';
      recommendations.push('Great start! Keep up the good medication adherence');
    } else if (totalScheduled === 0) {
      riskLevel = 'Low';
      recommendations.push('No doses due yet - check back after taking some medications');
    }
  } else if (adherenceRate < 50) {
    riskLevel = 'High';
    riskColor = 'text-red-600';
    riskBg = 'bg-red-50';
    warnings.push('Very low medication adherence - consult your doctor immediately');
    warnings.push('Missing medications can lead to treatment failure');
    recommendations.push('Set multiple daily reminders for medication times');
    recommendations.push('Use a pill organizer to track daily medications');
    recommendations.push('Discuss medication concerns with your healthcare provider');
  } else if (adherenceRate < 80) {
    riskLevel = 'Moderate';
    riskColor = 'text-orange-600';
    riskBg = 'bg-orange-50';
    warnings.push('Medication adherence below recommended levels');
    recommendations.push('Improve consistency with medication timing');
    recommendations.push('Set phone alarms for medication reminders');
    recommendations.push('Keep medications in visible locations');
  } else {
    recommendations.push('Excellent medication adherence - keep it up!');
    recommendations.push('Continue following your prescribed schedule');
    recommendations.push('Monitor for any side effects and report to doctor');
  }
  
  // Side effects analysis
  const recentSideEffects = recentLogs.flatMap(log => log.sideEffectsExperienced || []);
  const sideEffectCounts = {};
  recentSideEffects.forEach(effect => {
    sideEffectCounts[effect] = (sideEffectCounts[effect] || 0) + 1;
  });
  
  if (Object.keys(sideEffectCounts).length > 0) {
    warnings.push('Side effects reported - monitor and discuss with doctor');
    recommendations.push('Keep a detailed log of side effects and their timing');
    recommendations.push('Report persistent or severe side effects to your doctor');
  }
  
  // Active medicines analysis
  const currentActiveMedicines = this.medicines.filter(med => med.isActive && new Date(med.endDate) >= now);
  const expiringSoon = currentActiveMedicines.filter(med => {
    const daysUntilEnd = Math.ceil((new Date(med.endDate) - now) / (1000 * 60 * 60 * 24));
    return daysUntilEnd <= 3;
  });
  
  if (expiringSoon.length > 0) {
    warnings.push(`${expiringSoon.length} medication(s) ending soon - plan refills`);
    recommendations.push('Contact your pharmacy or doctor for prescription refills');
  }
  
  // Calculate actual days analyzed
  const daysAnalyzed = Math.ceil((now - analysisStartDate) / (1000 * 60 * 60 * 24));
  
  return {
    riskLevel,
    riskColor,
    riskBg,
    adherenceRate,
    onTimeRate,
    totalScheduled,
    taken,
    missed,
    skipped,
    activeMedicines: activeMedicines.length,
    expiringSoon: expiringSoon.length,
    recommendations,
    warnings,
    sideEffectCounts,
    daysAnalyzed: Math.max(1, daysAnalyzed)
  };
};

medicineTrackerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('MedicineTracker', medicineTrackerSchema);