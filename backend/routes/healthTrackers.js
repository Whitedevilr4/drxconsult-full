const express = require('express');
const { body, validationResult } = require('express-validator');
const ChildVaccineTracker = require('../models/ChildVaccineTracker');
const PeriodTracker = require('../models/PeriodTracker');
const BPTracker = require('../models/BPTracker');
const DiabetesTracker = require('../models/DiabetesTracker');
const SleepTracker = require('../models/SleepTracker');
const MoodTracker = require('../models/MoodTracker');
const OverallHealthTracker = require('../models/OverallHealthTracker');
const MedicineTracker = require('../models/MedicineTracker');
const SubstanceUseTracker = require('../models/SubstanceUseTracker');
const FoodTracker = require('../models/FoodTracker');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Vaccine schedule data
const VACCINE_SCHEDULE = [
  { name: 'BCG', ageInDays: 0, description: 'Tuberculosis vaccine' },
  { name: 'Hepatitis B (1st dose)', ageInDays: 0, description: 'First dose at birth' },
  { name: 'OPV (1st dose)', ageInDays: 42, description: 'Oral Polio Vaccine' },
  { name: 'DPT (1st dose)', ageInDays: 42, description: 'Diphtheria, Pertussis, Tetanus' },
  { name: 'Hepatitis B (2nd dose)', ageInDays: 42, description: 'Second dose' },
  { name: 'Hib (1st dose)', ageInDays: 42, description: 'Haemophilus influenzae type b' },
  { name: 'Rotavirus (1st dose)', ageInDays: 42, description: 'Rotavirus vaccine' },
  { name: 'PCV (1st dose)', ageInDays: 42, description: 'Pneumococcal vaccine' },
  { name: 'OPV (2nd dose)', ageInDays: 70, description: 'Second dose' },
  { name: 'DPT (2nd dose)', ageInDays: 70, description: 'Second dose' },
  { name: 'Hib (2nd dose)', ageInDays: 70, description: 'Second dose' },
  { name: 'Rotavirus (2nd dose)', ageInDays: 70, description: 'Second dose' },
  { name: 'PCV (2nd dose)', ageInDays: 70, description: 'Second dose' },
  { name: 'OPV (3rd dose)', ageInDays: 98, description: 'Third dose' },
  { name: 'DPT (3rd dose)', ageInDays: 98, description: 'Third dose' },
  { name: 'Hepatitis B (3rd dose)', ageInDays: 98, description: 'Third dose' },
  { name: 'Hib (3rd dose)', ageInDays: 98, description: 'Third dose' },
  { name: 'Rotavirus (3rd dose)', ageInDays: 98, description: 'Third dose' },
  { name: 'PCV (3rd dose)', ageInDays: 98, description: 'Third dose' },
  { name: 'IPV (1st dose)', ageInDays: 98, description: 'Inactivated Polio Vaccine' },
  { name: 'Measles (1st dose)', ageInDays: 270, description: 'Measles vaccine' },
  { name: 'JE (1st dose)', ageInDays: 270, description: 'Japanese Encephalitis' },
  { name: 'Vitamin A (1st dose)', ageInDays: 270, description: 'Vitamin A supplement' },
  { name: 'DPT (Booster 1)', ageInDays: 450, description: 'First booster' },
  { name: 'OPV (Booster 1)', ageInDays: 450, description: 'First booster' },
  { name: 'Measles (2nd dose)', ageInDays: 450, description: 'Second dose' },
  { name: 'JE (2nd dose)', ageInDays: 450, description: 'Second dose' },
  { name: 'Vitamin A (2nd dose)', ageInDays: 450, description: 'Second dose' },
  { name: 'DPT (Booster 2)', ageInDays: 1825, description: 'Second booster at 5 years' },
  { name: 'OPV (Booster 2)', ageInDays: 1825, description: 'Second booster at 5 years' },
  { name: 'Typhoid', ageInDays: 1825, description: 'Typhoid vaccine at 5 years' }
];

// ===== CHILD VACCINE TRACKER ROUTES =====

// Get all vaccine trackers for user
router.get('/vaccine-tracker', auth, async (req, res) => {
  try {
    const trackers = await ChildVaccineTracker.find({ userId: req.user.userId });
    res.json(trackers);
  } catch (error) {
    console.error('Error fetching vaccine trackers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new vaccine tracker
router.post('/vaccine-tracker', [
  auth,
  body('babyName').notEmpty().withMessage('Baby name is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['male', 'female']).withMessage('Gender must be male or female')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { babyName, dateOfBirth, gender } = req.body;
    const birthDate = new Date(dateOfBirth);
    
    // Generate vaccine schedule based on birth date
    const vaccines = VACCINE_SCHEDULE.map(vaccine => {
      const dueDate = new Date(birthDate);
      dueDate.setDate(birthDate.getDate() + vaccine.ageInDays);
      
      return {
        vaccineName: vaccine.name,
        dueDate: dueDate,
        ageAtVaccination: vaccine.ageInDays === 0 ? 'At birth' : 
          vaccine.ageInDays < 30 ? `${vaccine.ageInDays} days` :
          vaccine.ageInDays < 365 ? `${Math.round(vaccine.ageInDays / 30)} months` :
          `${Math.round(vaccine.ageInDays / 365)} years`,
        isCompleted: false
      };
    });

    const tracker = new ChildVaccineTracker({
      userId: req.user.userId,
      babyName,
      dateOfBirth: birthDate,
      gender,
      vaccines
    });

    await tracker.save();
    res.status(201).json(tracker);
  } catch (error) {
    console.error('Error creating vaccine tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update vaccine completion
router.patch('/vaccine-tracker/:trackerId/vaccine/:vaccineId', auth, async (req, res) => {
  try {
    const { trackerId, vaccineId } = req.params;
    const { isCompleted, completedDate, notes } = req.body;

    const tracker = await ChildVaccineTracker.findOne({ 
      _id: trackerId, 
      userId: req.user.userId 
    });

    if (!tracker) {
      return res.status(404).json({ message: 'Vaccine tracker not found' });
    }

    const vaccine = tracker.vaccines.id(vaccineId);
    if (!vaccine) {
      return res.status(404).json({ message: 'Vaccine not found' });
    }

    vaccine.isCompleted = isCompleted;
    if (isCompleted && completedDate) {
      vaccine.completedDate = new Date(completedDate);
    }
    if (notes) {
      vaccine.notes = notes;
    }

    await tracker.save();
    res.json(tracker);
  } catch (error) {
    console.error('Error updating vaccine:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== PERIOD TRACKER ROUTES =====

// Get period tracker for user
router.get('/period-tracker', auth, async (req, res) => {
  try {
    const tracker = await PeriodTracker.findOne({ userId: req.user.userId });
    res.json(tracker);
  } catch (error) {
    console.error('Error fetching period tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create/Update period tracker
router.post('/period-tracker', [
  auth,
  body('womanName').notEmpty().withMessage('Name is required'),
  body('age').isInt({ min: 10, max: 60 }).withMessage('Age must be between 10 and 60'),
  body('lastPeriodDate').isISO8601().withMessage('Valid last period date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { womanName, age, lastPeriodDate, averageCycleLength } = req.body;

    let tracker = await PeriodTracker.findOne({ userId: req.user.userId });
    
    if (tracker) {
      // Update existing tracker
      tracker.womanName = womanName;
      tracker.age = age;
      tracker.lastPeriodDate = new Date(lastPeriodDate);
      if (averageCycleLength) tracker.averageCycleLength = averageCycleLength;
    } else {
      // Create new tracker
      tracker = new PeriodTracker({
        userId: req.user.userId,
        womanName,
        age,
        lastPeriodDate: new Date(lastPeriodDate),
        averageCycleLength: averageCycleLength || 28
      });
    }

    await tracker.save();
    res.json(tracker);
  } catch (error) {
    console.error('Error creating/updating period tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add period record
router.post('/period-tracker/period', [
  auth,
  body('startDate').isISO8601().withMessage('Valid start date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { startDate, endDate, flow, symptoms, notes } = req.body;

    const tracker = await PeriodTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Period tracker not found' });
    }

    const periodRecord = {
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      flow: flow || 'normal',
      symptoms: symptoms || [],
      notes: notes || ''
    };

    tracker.periods.push(periodRecord);
    tracker.lastPeriodDate = new Date(startDate);
    
    await tracker.save();
    res.json(tracker);
  } catch (error) {
    console.error('Error adding period record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PCOS Assessment
router.post('/period-tracker/pcos-assessment', auth, async (req, res) => {
  try {
    const assessment = req.body;

    const tracker = await PeriodTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Period tracker not found' });
    }

    const riskAnalysis = tracker.calculatePCOSRisk(assessment);
    
    const pcosAssessment = {
      ...assessment,
      assessmentDate: new Date(),
      riskScore: riskAnalysis.score,
      riskLevel: riskAnalysis.riskLevel,
      recommendations: riskAnalysis.recommendations
    };

    tracker.pcosAssessments.push(pcosAssessment);
    await tracker.save();

    res.json({
      assessment: pcosAssessment,
      riskAnalysis
    });
  } catch (error) {
    console.error('Error processing PCOS assessment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== BP TRACKER ROUTES =====

// Get BP readings for user
router.get('/bp-tracker', auth, async (req, res) => {
  try {
    const tracker = await BPTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json([]);
    }
    // Return readings sorted by date (newest first)
    const sortedReadings = tracker.readings.sort((a, b) => new Date(b.takenAt || b.readingDate) - new Date(a.takenAt || a.readingDate));
    res.json(sortedReadings);
  } catch (error) {
    console.error('Error fetching BP readings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add BP reading
router.post('/bp-tracker', [
  auth,
  body('systolic').isInt({ min: 50, max: 300 }).withMessage('Systolic must be between 50 and 300'),
  body('diastolic').isInt({ min: 30, max: 200 }).withMessage('Diastolic must be between 30 and 200')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { systolic, diastolic, heartRate, notes, takenAt } = req.body;

    let tracker = await BPTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      // Create new tracker if it doesn't exist
      tracker = new BPTracker({
        userId: req.user.userId,
        patientName: 'User', // Default name
        age: 30, // Default age
        gender: 'male', // Default gender
        readings: []
      });
    }

    const reading = {
      systolic: parseInt(systolic),
      diastolic: parseInt(diastolic),
      pulse: heartRate ? parseInt(heartRate) : null,
      readingDate: takenAt ? new Date(takenAt) : new Date(),
      takenAt: takenAt ? new Date(takenAt) : new Date(),
      notes: notes || '',
      category: tracker.categorizeBP(parseInt(systolic), parseInt(diastolic))
    };

    tracker.readings.push(reading);
    await tracker.save();

    res.json(reading);
  } catch (error) {
    console.error('Error adding BP reading:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete BP reading
router.delete('/bp-tracker/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = await BPTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      return res.status(404).json({ message: 'BP tracker not found' });
    }

    tracker.readings = tracker.readings.filter(reading => reading._id.toString() !== id);
    await tracker.save();

    res.json({ message: 'Reading deleted successfully' });
  } catch (error) {
    console.error('Error deleting BP reading:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== DIABETES TRACKER ROUTES =====

// Get diabetes readings for user
router.get('/diabetes-tracker', auth, async (req, res) => {
  try {
    const tracker = await DiabetesTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json([]);
    }
    // Return readings sorted by date (newest first)
    const sortedReadings = tracker.glucoseReadings.sort((a, b) => new Date(b.takenAt || b.readingDate) - new Date(a.takenAt || a.readingDate));
    res.json(sortedReadings);
  } catch (error) {
    console.error('Error fetching diabetes readings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add glucose reading
router.post('/diabetes-tracker', [
  auth,
  body('glucoseLevel').isInt({ min: 20, max: 600 }).withMessage('Glucose level must be between 20 and 600'),
  body('readingType').isIn(['fasting', 'postMeal', 'random', 'bedtime']).withMessage('Invalid reading type')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { glucoseLevel, readingType, notes, takenAt, medication, carbs, exercise } = req.body;

    let tracker = await DiabetesTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      // Create new tracker if it doesn't exist
      tracker = new DiabetesTracker({
        userId: req.user.userId,
        patientName: 'User', // Default name
        age: 30, // Default age
        gender: 'male', // Default gender
        diabetesType: 'type2', // Default type
        glucoseReadings: []
      });
    }

    // Map frontend readingType to backend format
    let backendReadingType = readingType;
    if (readingType === 'postMeal') {
      backendReadingType = 'after_meal';
    }

    const reading = {
      glucoseLevel: parseInt(glucoseLevel),
      readingType: backendReadingType,
      readingDate: takenAt ? new Date(takenAt) : new Date(),
      takenAt: takenAt ? new Date(takenAt) : new Date(),
      mealDetails: carbs ? `${carbs}g carbs` : '',
      medication: medication || '',
      carbs: carbs || '',
      exercise: exercise || '',
      notes: notes || '',
      category: tracker.categorizeGlucose(parseInt(glucoseLevel), backendReadingType)
    };

    tracker.glucoseReadings.push(reading);
    await tracker.save();

    res.json(reading);
  } catch (error) {
    console.error('Error adding glucose reading:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete glucose reading
router.delete('/diabetes-tracker/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = await DiabetesTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      return res.status(404).json({ message: 'Diabetes tracker not found' });
    }

    tracker.glucoseReadings = tracker.glucoseReadings.filter(reading => reading._id.toString() !== id);
    await tracker.save();

    res.json({ message: 'Reading deleted successfully' });
  } catch (error) {
    console.error('Error deleting glucose reading:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== SLEEP TRACKER ROUTES =====

// Get sleep tracker for user
router.get('/sleep-tracker', auth, async (req, res) => {
  try {
    const tracker = await SleepTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json({ entries: [] });
    }
    // Return entries sorted by date (newest first)
    const sortedEntries = tracker.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ ...tracker.toObject(), entries: sortedEntries });
  } catch (error) {
    console.error('Error fetching sleep tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add sleep entry
router.post('/sleep-tracker', [
  auth,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('bedTime').notEmpty().withMessage('Bed time is required'),
  body('sleepTime').notEmpty().withMessage('Sleep time is required'),
  body('wakeTime').notEmpty().withMessage('Wake time is required'),
  body('sleepQuality').isIn(['poor', 'fair', 'good', 'excellent']).withMessage('Invalid sleep quality'),
  body('timeToFallAsleep').isInt({ min: 0, max: 300 }).withMessage('Time to fall asleep must be between 0 and 300 minutes')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      date, bedTime, sleepTime, wakeTime, sleepQuality, timeToFallAsleep,
      nightWakeups, caffeineIntake, screenTimeBeforeBed, exerciseToday, stressLevel, notes
    } = req.body;

    // Calculate sleep duration
    const sleepStart = new Date(`${date}T${sleepTime}`);
    const sleepEnd = new Date(`${date}T${wakeTime}`);
    if (sleepEnd < sleepStart) {
      sleepEnd.setDate(sleepEnd.getDate() + 1); // Next day
    }
    const sleepDuration = (sleepEnd - sleepStart) / (1000 * 60 * 60); // in hours

    let tracker = await SleepTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      tracker = new SleepTracker({
        userId: req.user.userId,
        entries: []
      });
    }

    const entry = {
      date: new Date(date),
      bedTime,
      sleepTime,
      wakeTime,
      sleepQuality,
      sleepDuration: Math.round(sleepDuration * 100) / 100, // Round to 2 decimal places
      timeToFallAsleep: parseInt(timeToFallAsleep),
      nightWakeups: nightWakeups || 0,
      caffeineIntake: caffeineIntake || 'none',
      screenTimeBeforeBed: screenTimeBeforeBed || 0,
      exerciseToday: exerciseToday || false,
      stressLevel: stressLevel || 'low',
      notes: notes || ''
    };

    tracker.entries.push(entry);
    await tracker.save();

    res.json(entry);
  } catch (error) {
    console.error('Error adding sleep entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete sleep entry
router.delete('/sleep-tracker/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = await SleepTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      return res.status(404).json({ message: 'Sleep tracker not found' });
    }

    tracker.entries = tracker.entries.filter(entry => entry._id.toString() !== id);
    await tracker.save();

    res.json({ message: 'Sleep entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting sleep entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== MOOD TRACKER ROUTES =====

// Get mood tracker for user
router.get('/mood-tracker', auth, async (req, res) => {
  try {
    const tracker = await MoodTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json({ entries: [] });
    }
    // Return entries sorted by date (newest first)
    const sortedEntries = tracker.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ ...tracker.toObject(), entries: sortedEntries });
  } catch (error) {
    console.error('Error fetching mood tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add mood entry
router.post('/mood-tracker', [
  auth,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('overallMood').isIn(['very_sad', 'sad', 'neutral', 'happy', 'very_happy']).withMessage('Invalid overall mood'),
  body('energyLevel').isIn(['very_low', 'low', 'moderate', 'high', 'very_high']).withMessage('Invalid energy level'),
  body('stressLevel').isIn(['very_low', 'low', 'moderate', 'high', 'very_high']).withMessage('Invalid stress level'),
  body('anxietyLevel').isIn(['none', 'mild', 'moderate', 'high', 'severe']).withMessage('Invalid anxiety level'),
  body('sleepQuality').isIn(['very_poor', 'poor', 'fair', 'good', 'excellent']).withMessage('Invalid sleep quality'),
  body('socialInteraction').isIn(['none', 'minimal', 'moderate', 'active', 'very_active']).withMessage('Invalid social interaction'),
  body('physicalActivity').isIn(['none', 'light', 'moderate', 'intense', 'very_intense']).withMessage('Invalid physical activity')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      date, overallMood, energyLevel, stressLevel, anxietyLevel, sleepQuality,
      socialInteraction, physicalActivity, symptoms, triggers, copingStrategies, notes
    } = req.body;

    let tracker = await MoodTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      tracker = new MoodTracker({
        userId: req.user.userId,
        entries: []
      });
    }

    const entry = {
      date: new Date(date),
      overallMood,
      energyLevel,
      stressLevel,
      anxietyLevel,
      sleepQuality,
      socialInteraction,
      physicalActivity,
      symptoms: symptoms || [],
      triggers: triggers || [],
      copingStrategies: copingStrategies || [],
      notes: notes || ''
    };

    tracker.entries.push(entry);
    await tracker.save();

    res.json(entry);
  } catch (error) {
    console.error('Error adding mood entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete mood entry
router.delete('/mood-tracker/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = await MoodTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      return res.status(404).json({ message: 'Mood tracker not found' });
    }

    tracker.entries = tracker.entries.filter(entry => entry._id.toString() !== id);
    await tracker.save();

    res.json({ message: 'Mood entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting mood entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== OVERALL HEALTH TRACKER ROUTES =====

// Get overall health tracker for user
router.get('/overall-health-tracker', auth, async (req, res) => {
  try {
    const tracker = await OverallHealthTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json({ entries: [] });
    }
    // Return entries sorted by date (newest first)
    const sortedEntries = tracker.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ ...tracker.toObject(), entries: sortedEntries });
  } catch (error) {
    console.error('Error fetching overall health tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add health entry with remedy recommendations
router.post('/overall-health-tracker', [
  auth,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('overallWellbeing').isIn(['excellent', 'good', 'fair', 'poor', 'very_poor']).withMessage('Invalid overall wellbeing'),
  body('energyLevel').isIn(['very_low', 'low', 'moderate', 'high', 'very_high']).withMessage('Invalid energy level'),
  body('sleepQuality').isIn(['very_poor', 'poor', 'fair', 'good', 'excellent']).withMessage('Invalid sleep quality'),
  body('appetiteLevel').isIn(['very_poor', 'poor', 'normal', 'good', 'excessive']).withMessage('Invalid appetite level'),
  body('stressLevel').isIn(['very_low', 'low', 'moderate', 'high', 'very_high']).withMessage('Invalid stress level'),
  body('hydrationLevel').isIn(['very_low', 'low', 'adequate', 'good', 'excellent']).withMessage('Invalid hydration level')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      date, symptoms, overallWellbeing, energyLevel, sleepQuality, appetiteLevel,
      stressLevel, hydrationLevel, additionalSymptoms, triggers, remediesTried, notes
    } = req.body;

    let tracker = await OverallHealthTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      tracker = new OverallHealthTracker({
        userId: req.user.userId,
        entries: []
      });
    }

    const entry = {
      date: new Date(date),
      symptoms: symptoms || {
        headache: { severity: 'none', duration: 0, type: 'tension' },
        runnyNose: { severity: 'none', color: 'clear' },
        sneezing: { severity: 'none', frequency: 'occasional' },
        coughing: { severity: 'none', type: 'dry', duration: 0 },
        fever: { temperature: 0, duration: 0, pattern: 'continuous' },
        pain: { severity: 'none', location: [], type: 'dull' }
      },
      overallWellbeing,
      energyLevel,
      sleepQuality,
      appetiteLevel,
      stressLevel,
      hydrationLevel,
      additionalSymptoms: additionalSymptoms || [],
      triggers: triggers || [],
      remediesTried: remediesTried || [],
      notes: notes || ''
    };

    tracker.entries.push(entry);
    await tracker.save();

    // Generate remedy recommendations
    const recommendations = tracker.generateRemedyRecommendations(entry);

    res.json({
      entry,
      recommendations
    });
  } catch (error) {
    console.error('Error adding health entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get remedy recommendations for existing entry
router.get('/overall-health-tracker/:entryId/recommendations', auth, async (req, res) => {
  try {
    const { entryId } = req.params;
    const tracker = await OverallHealthTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      return res.status(404).json({ message: 'Health tracker not found' });
    }

    const entry = tracker.entries.id(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Health entry not found' });
    }

    const recommendations = tracker.generateRemedyRecommendations(entry);
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete health entry
router.delete('/overall-health-tracker/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = await OverallHealthTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      return res.status(404).json({ message: 'Health tracker not found' });
    }

    tracker.entries = tracker.entries.filter(entry => entry._id.toString() !== id);
    await tracker.save();

    res.json({ message: 'Health entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting health entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== MEDICINE TRACKER ROUTES =====

// Get medicine tracker for user
router.get('/medicine-tracker', auth, async (req, res) => {
  try {
    const tracker = await MedicineTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json({ medicines: [], medicineLog: [] });
    }
    res.json(tracker);
  } catch (error) {
    console.error('Error fetching medicine tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add medicine
router.post('/medicine-tracker/medicine', [
  auth,
  body('medicineName').notEmpty().withMessage('Medicine name is required'),
  body('medicineType').isIn(['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler', 'other']).withMessage('Invalid medicine type'),
  body('purpose').notEmpty().withMessage('Purpose is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('schedule').isArray().withMessage('Schedule must be an array')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      medicineName, medicineType, purpose, startDate, endDate,
      schedule, prescribedBy, sideEffects, notes
    } = req.body;

    let tracker = await MedicineTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      tracker = new MedicineTracker({
        userId: req.user.userId,
        medicines: [],
        medicineLog: []
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const medicine = {
      medicineName,
      medicineType,
      purpose,
      startDate: start,
      endDate: end,
      totalDuration,
      schedule: schedule || [],
      prescribedBy: prescribedBy || '',
      sideEffects: sideEffects || [],
      notes: notes || ''
    };

    tracker.medicines.push(medicine);
    await tracker.save();

    // Generate medicine log entries for the schedule
    const medicineId = tracker.medicines[tracker.medicines.length - 1]._id;
    const logEntries = [];
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      schedule.forEach(scheduleItem => {
        logEntries.push({
          medicineId,
          scheduledDate: new Date(date),
          scheduledTime: scheduleItem.time,
          status: 'due'
        });
      });
    }

    tracker.medicineLog.push(...logEntries);
    await tracker.save();

    res.json(medicine);
  } catch (error) {
    console.error('Error adding medicine:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update medicine log (mark as taken/missed)
router.patch('/medicine-tracker/log/:logId', auth, async (req, res) => {
  try {
    const { logId } = req.params;
    const { status, takenAt, actualDosage, notes, sideEffectsExperienced } = req.body;

    const tracker = await MedicineTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Medicine tracker not found' });
    }

    const logEntry = tracker.medicineLog.id(logId);
    if (!logEntry) {
      return res.status(404).json({ message: 'Medicine log entry not found' });
    }

    logEntry.status = status;
    if (takenAt) logEntry.takenAt = new Date(takenAt);
    if (actualDosage) logEntry.actualDosage = actualDosage;
    if (notes) logEntry.notes = notes;
    if (sideEffectsExperienced) logEntry.sideEffectsExperienced = sideEffectsExperienced;

    await tracker.save();
    res.json(logEntry);
  } catch (error) {
    console.error('Error updating medicine log:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get medicine adherence analysis
router.get('/medicine-tracker/analysis', auth, async (req, res) => {
  try {
    const tracker = await MedicineTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json({ message: 'No medicine data found' });
    }

    const analysis = tracker.generateAdherenceAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('Error generating medicine analysis:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete medicine
router.delete('/medicine-tracker/medicine/:medicineId', auth, async (req, res) => {
  try {
    const { medicineId } = req.params;
    const tracker = await MedicineTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      return res.status(404).json({ message: 'Medicine tracker not found' });
    }

    tracker.medicines = tracker.medicines.filter(med => med._id.toString() !== medicineId);
    tracker.medicineLog = tracker.medicineLog.filter(log => log.medicineId.toString() !== medicineId);
    
    await tracker.save();
    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== SUBSTANCE USE TRACKER ROUTES =====

// Get substance use tracker for user
router.get('/substance-tracker', auth, async (req, res) => {
  try {
    const tracker = await SubstanceUseTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json({ entries: [], userProfile: null });
    }
    res.json(tracker);
  } catch (error) {
    console.error('Error fetching substance tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create/Update user profile
router.post('/substance-tracker/profile', [
  auth,
  body('age').isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { age, gender, weight, smokingHistory, drinkingHistory } = req.body;

    let tracker = await SubstanceUseTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      tracker = new SubstanceUseTracker({
        userId: req.user.userId,
        userProfile: {
          age,
          gender,
          weight: weight || 70,
          smokingHistory: smokingHistory || {},
          drinkingHistory: drinkingHistory || {}
        },
        entries: []
      });
    } else {
      tracker.userProfile = {
        age,
        gender,
        weight: weight || 70,
        smokingHistory: smokingHistory || {},
        drinkingHistory: drinkingHistory || {}
      };
    }

    await tracker.save();
    res.json(tracker.userProfile);
  } catch (error) {
    console.error('Error updating substance tracker profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add substance use entry
router.post('/substance-tracker/entry', [
  auth,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('mood').isIn(['very_bad', 'bad', 'neutral', 'good', 'very_good']).withMessage('Invalid mood'),
  body('cravingLevel').isIn(['none', 'mild', 'moderate', 'strong', 'overwhelming']).withMessage('Invalid craving level')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      date, smoking, alcohol, triggers, mood, cravingLevel,
      location, withOthers, notes
    } = req.body;

    const tracker = await SubstanceUseTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Please set up your profile first' });
    }

    const entry = {
      date: new Date(date),
      smoking: smoking || { cigarettes: 0, cigars: 0, vaping: { sessions: 0, nicotineStrength: 'none' }, other: '' },
      alcohol: alcohol || { beer: 0, wine: 0, spirits: 0, other: '' },
      triggers: triggers || [],
      mood,
      cravingLevel,
      location: location || 'home',
      withOthers: withOthers || false,
      notes: notes || ''
    };

    tracker.entries.push(entry);
    await tracker.save();

    // Generate risk analysis
    const analysis = tracker.generateRiskAnalysis();

    res.json({
      entry,
      analysis
    });
  } catch (error) {
    console.error('Error adding substance use entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get substance use risk analysis
router.get('/substance-tracker/analysis', auth, async (req, res) => {
  try {
    const tracker = await SubstanceUseTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json({ message: 'No substance use data found' });
    }

    const analysis = tracker.generateRiskAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('Error generating substance use analysis:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete substance use entry
router.delete('/substance-tracker/entry/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = await SubstanceUseTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      return res.status(404).json({ message: 'Substance tracker not found' });
    }

    tracker.entries = tracker.entries.filter(entry => entry._id.toString() !== id);
    await tracker.save();

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting substance use entry:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

// Food Database - Common foods with nutritional information
const FOOD_DATABASE = {
  breakfast: [
    { name: 'Idli (2 pieces)', calories: 78, carbs: 17, protein: 2, fat: 0.5, fiber: 1, sugar: 1, sodium: 4, cholesterol: 0, healthScore: 9 },
    { name: 'Dosa (1 medium)', calories: 133, carbs: 16, protein: 4, fat: 7, fiber: 1, sugar: 1, sodium: 184, cholesterol: 0, healthScore: 8 },
    { name: 'Upma (1 bowl)', calories: 251, carbs: 44, protein: 6, fat: 6, fiber: 2, sugar: 2, sodium: 400, cholesterol: 0, healthScore: 7 },
    { name: 'Poha (1 bowl)', calories: 180, carbs: 35, protein: 3, fat: 4, fiber: 2, sugar: 3, sodium: 300, cholesterol: 0, healthScore: 8 },
    { name: 'Paratha (1 piece)', calories: 126, carbs: 18, protein: 3, fat: 5, fiber: 2, sugar: 1, sodium: 230, cholesterol: 0, healthScore: 6 },
    { name: 'Aloo Paratha (1 piece)', calories: 180, carbs: 25, protein: 4, fat: 8, fiber: 3, sugar: 2, sodium: 350, cholesterol: 0, healthScore: 6 },
    { name: 'Masala Chai (1 cup)', calories: 60, carbs: 8, protein: 3, fat: 3, fiber: 0, sugar: 6, sodium: 40, cholesterol: 10, healthScore: 6 },
    { name: 'Daliya/Broken Wheat (1 bowl)', calories: 216, carbs: 44, protein: 8, fat: 1, fiber: 6, sugar: 1, sodium: 8, cholesterol: 0, healthScore: 9 },
    { name: 'Banana (1 medium)', calories: 105, carbs: 27, protein: 1, fat: 0, fiber: 3, sugar: 14, sodium: 1, cholesterol: 0, healthScore: 8 },
    { name: 'Scrambled Eggs (2 eggs)', calories: 182, carbs: 2, protein: 12, fat: 14, fiber: 0, sugar: 2, sodium: 342, cholesterol: 372, healthScore: 7 }
  ],
  lunch: [
    { name: 'Dal Rice (1 bowl)', calories: 298, carbs: 58, protein: 12, fat: 2, fiber: 4, sugar: 2, sodium: 400, cholesterol: 0, healthScore: 9 },
    { name: 'Rajma Rice (1 bowl)', calories: 350, carbs: 65, protein: 15, fat: 3, fiber: 8, sugar: 3, sodium: 500, cholesterol: 0, healthScore: 9 },
    { name: 'Chole Bhature (1 plate)', calories: 427, carbs: 58, protein: 12, fat: 16, fiber: 6, sugar: 4, sodium: 800, cholesterol: 0, healthScore: 6 },
    { name: 'Vegetable Biryani (1 plate)', calories: 380, carbs: 65, protein: 8, fat: 10, fiber: 3, sugar: 5, sodium: 600, cholesterol: 0, healthScore: 7 },
    { name: 'Chicken Curry with Rice', calories: 420, carbs: 45, protein: 28, fat: 15, fiber: 2, sugar: 4, sodium: 700, cholesterol: 75, healthScore: 7 },
    { name: 'Sambar Rice (1 bowl)', calories: 280, carbs: 52, protein: 10, fat: 4, fiber: 5, sugar: 6, sodium: 450, cholesterol: 0, healthScore: 8 },
    { name: 'Paneer Butter Masala with Roti', calories: 385, carbs: 35, protein: 18, fat: 20, fiber: 4, sugar: 8, sodium: 650, cholesterol: 40, healthScore: 6 },
    { name: 'Fish Curry with Rice', calories: 340, carbs: 42, protein: 25, fat: 8, fiber: 2, sugar: 3, sodium: 550, cholesterol: 60, healthScore: 8 },
    { name: 'Aloo Gobi with Chapati', calories: 285, carbs: 48, protein: 8, fat: 8, fiber: 6, sugar: 5, sodium: 400, cholesterol: 0, healthScore: 8 },
    { name: 'Khichdi (1 bowl)', calories: 203, carbs: 40, protein: 8, fat: 2, fiber: 3, sugar: 2, sodium: 300, cholesterol: 0, healthScore: 9 }
  ],
  dinner: [
    { name: 'Dal Tadka with Chapati', calories: 320, carbs: 52, protein: 14, fat: 8, fiber: 6, sugar: 3, sodium: 450, cholesterol: 0, healthScore: 9 },
    { name: 'Chicken Tikka Masala with Rice', calories: 450, carbs: 48, protein: 32, fat: 18, fiber: 3, sugar: 6, sodium: 800, cholesterol: 85, healthScore: 7 },
    { name: 'Palak Paneer with Roti', calories: 340, carbs: 28, protein: 16, fat: 20, fiber: 5, sugar: 4, sodium: 600, cholesterol: 35, healthScore: 8 },
    { name: 'Mutton Curry with Rice', calories: 520, carbs: 45, protein: 35, fat: 22, fiber: 2, sugar: 4, sodium: 750, cholesterol: 95, healthScore: 6 },
    { name: 'Vegetable Pulao (1 plate)', calories: 285, carbs: 55, protein: 6, fat: 5, fiber: 3, sugar: 4, sodium: 400, cholesterol: 0, healthScore: 8 },
    { name: 'Baingan Bharta with Chapati', calories: 260, carbs: 42, protein: 8, fat: 8, fiber: 7, sugar: 8, sodium: 350, cholesterol: 0, healthScore: 8 },
    { name: 'Fish Fry with Rice', calories: 380, carbs: 42, protein: 28, fat: 12, fiber: 1, sugar: 2, sodium: 500, cholesterol: 70, healthScore: 7 },
    { name: 'Kadhi Chawal (1 bowl)', calories: 295, carbs: 48, protein: 8, fat: 8, fiber: 2, sugar: 6, sodium: 550, cholesterol: 15, healthScore: 7 },
    { name: 'Bhindi Masala with Roti', calories: 240, carbs: 35, protein: 7, fat: 9, fiber: 6, sugar: 5, sodium: 300, cholesterol: 0, healthScore: 8 },
    { name: 'Egg Curry with Rice', calories: 365, carbs: 45, protein: 18, fat: 14, fiber: 2, sugar: 3, sodium: 600, cholesterol: 186, healthScore: 7 }
  ],
  snacks: [
    { name: 'Samosa (1 piece)', calories: 91, carbs: 10, protein: 2, fat: 5, fiber: 1, sugar: 1, sodium: 135, cholesterol: 0, healthScore: 4 },
    { name: 'Dhokla (2 pieces)', calories: 85, carbs: 16, protein: 3, fat: 1, fiber: 2, sugar: 2, sodium: 200, cholesterol: 0, healthScore: 8 },
    { name: 'Roasted Chana (1/4 cup)', calories: 134, carbs: 22, protein: 7, fat: 2, fiber: 6, sugar: 4, sodium: 6, cholesterol: 0, healthScore: 9 },
    { name: 'Bhel Puri (1 bowl)', calories: 220, carbs: 35, protein: 6, fat: 7, fiber: 4, sugar: 8, sodium: 450, cholesterol: 0, healthScore: 6 },
    { name: 'Banana (1 medium)', calories: 105, carbs: 27, protein: 1, fat: 0, fiber: 3, sugar: 14, sodium: 1, cholesterol: 0, healthScore: 8 },
    { name: 'Masala Peanuts (1/4 cup)', calories: 166, carbs: 6, protein: 7, fat: 14, fiber: 2, sugar: 1, sodium: 230, cholesterol: 0, healthScore: 7 },
    { name: 'Coconut Water (1 cup)', calories: 46, carbs: 9, protein: 2, fat: 0, fiber: 3, sugar: 6, sodium: 252, cholesterol: 0, healthScore: 9 },
    { name: 'Murukku (5 pieces)', calories: 120, carbs: 15, protein: 2, fat: 6, fiber: 1, sugar: 1, sodium: 180, cholesterol: 0, healthScore: 5 },
    { name: 'Lassi (1 glass)', calories: 108, carbs: 12, protein: 4, fat: 5, fiber: 0, sugar: 11, sodium: 58, cholesterol: 20, healthScore: 6 },
    { name: 'Roasted Makhana (1/2 cup)', calories: 87, carbs: 17, protein: 4, fat: 1, fiber: 1, sugar: 0, sodium: 1, cholesterol: 0, healthScore: 9 }
  ]
};

// Get food tracker for user
router.get('/food-tracker', auth, async (req, res) => {
  try {
    const tracker = await FoodTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json({ meals: [], userProfile: null });
    }
    res.json(tracker);
  } catch (error) {
    console.error('Error fetching food tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create/Update user profile
router.post('/food-tracker/profile', [
  auth,
  body('age').isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('weight').isFloat({ min: 30, max: 300 }).withMessage('Weight must be between 30 and 300 kg'),
  body('height').isFloat({ min: 100, max: 250 }).withMessage('Height must be between 100 and 250 cm'),
  body('activityLevel').isIn(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']).withMessage('Invalid activity level'),
  body('dietaryGoal').isIn(['weight_loss', 'weight_gain', 'maintain_weight', 'muscle_gain', 'general_health']).withMessage('Invalid dietary goal')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { age, gender, weight, height, activityLevel, dietaryGoal, dietaryRestrictions } = req.body;
    
    // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    
    // Calculate TDEE (Total Daily Energy Expenditure)
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    
    let tdee = bmr * activityMultipliers[activityLevel];
    
    // Adjust calories based on goal
    let dailyCalorieGoal;
    switch (dietaryGoal) {
      case 'weight_loss':
        dailyCalorieGoal = Math.round(tdee - 500); // 500 calorie deficit
        break;
      case 'weight_gain':
        dailyCalorieGoal = Math.round(tdee + 500); // 500 calorie surplus
        break;
      case 'muscle_gain':
        dailyCalorieGoal = Math.round(tdee + 300); // 300 calorie surplus
        break;
      default:
        dailyCalorieGoal = Math.round(tdee);
    }
    
    // Calculate macronutrient goals (balanced approach)
    const dailyProteinGoal = Math.round((dailyCalorieGoal * 0.25) / 4); // 25% protein
    const dailyCarbGoal = Math.round((dailyCalorieGoal * 0.45) / 4); // 45% carbs
    const dailyFatGoal = Math.round((dailyCalorieGoal * 0.30) / 9); // 30% fat
    
    const userProfile = {
      age,
      gender,
      weight,
      height,
      activityLevel,
      dietaryGoal,
      dietaryRestrictions: dietaryRestrictions || [],
      dailyCalorieGoal,
      dailyCarbGoal,
      dailyProteinGoal,
      dailyFatGoal
    };

    let tracker = await FoodTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      tracker = new FoodTracker({
        userId: req.user.userId,
        userProfile,
        meals: []
      });
    } else {
      tracker.userProfile = userProfile;
    }
    
    await tracker.save();
    res.json(tracker);
  } catch (error) {
    console.error('Error updating food tracker profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get food database
router.get('/food-tracker/foods', auth, async (req, res) => {
  try {
    const { mealType } = req.query;
    
    // Map singular meal types to plural database keys
    const mealTypeMapping = {
      'snack': 'snacks'
    };
    
    const dbKey = mealTypeMapping[mealType] || mealType;
    
    if (mealType && FOOD_DATABASE[dbKey]) {
      return res.json({ foods: FOOD_DATABASE[dbKey], mealType });
    }
    
    res.json({ foods: FOOD_DATABASE });
  } catch (error) {
    console.error('Error fetching food database:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add meal entry
router.post('/food-tracker/meal', [
  auth,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('mealType').isIn(['breakfast', 'lunch', 'dinner', 'snack']).withMessage('Invalid meal type'),
  body('foods').isArray({ min: 1 }).withMessage('At least one food item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, mealType, foods, notes } = req.body;
    
    let tracker = await FoodTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Food tracker profile not found. Please set up your profile first.' });
    }
    
    // Calculate totals for the meal
    let totalCalories = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;
    let totalFiber = 0, totalSugar = 0, totalSodium = 0, totalCholesterol = 0;
    
    const processedFoods = foods.map(food => {
      const quantity = food.quantity || 1;
      const calories = (food.calories || 0) * quantity;
      const carbs = (food.carbs || 0) * quantity;
      const protein = (food.protein || 0) * quantity;
      const fat = (food.fat || 0) * quantity;
      const fiber = (food.fiber || 0) * quantity;
      const sugar = (food.sugar || 0) * quantity;
      const sodium = (food.sodium || 0) * quantity;
      const cholesterol = (food.cholesterol || 0) * quantity;
      
      totalCalories += calories;
      totalCarbs += carbs;
      totalProtein += protein;
      totalFat += fat;
      totalFiber += fiber;
      totalSugar += sugar;
      totalSodium += sodium;
      totalCholesterol += cholesterol;
      
      return {
        foodItem: food.name || food.foodItem,
        quantity,
        calories: Math.round(calories),
        carbs: Math.round(carbs * 10) / 10,
        protein: Math.round(protein * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        fiber: Math.round(fiber * 10) / 10,
        sugar: Math.round(sugar * 10) / 10,
        sodium: Math.round(sodium),
        cholesterol: Math.round(cholesterol)
      };
    });
    
    const mealEntry = {
      date: new Date(date),
      mealType,
      foods: processedFoods,
      totalCalories: Math.round(totalCalories),
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
      totalFiber: Math.round(totalFiber * 10) / 10,
      totalSugar: Math.round(totalSugar * 10) / 10,
      totalSodium: Math.round(totalSodium),
      totalCholesterol: Math.round(totalCholesterol),
      notes: notes || ''
    };
    
    tracker.meals.push(mealEntry);
    await tracker.save();
    
    // Generate analysis for the day
    const analysis = tracker.getDailyAnalysis(date);
    
    res.json({ meal: mealEntry, analysis });
  } catch (error) {
    console.error('Error adding meal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get daily analysis
router.get('/food-tracker/analysis', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const analysisDate = date || new Date().toISOString().split('T')[0];
    
    const tracker = await FoodTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Food tracker not found' });
    }
    
    const analysis = tracker.getDailyAnalysis(analysisDate);
    res.json(analysis);
  } catch (error) {
    console.error('Error getting daily analysis:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get weekly trends
router.get('/food-tracker/trends', auth, async (req, res) => {
  try {
    const tracker = await FoodTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Food tracker not found' });
    }
    
    const trends = tracker.getWeeklyTrends();
    res.json(trends);
  } catch (error) {
    console.error('Error getting weekly trends:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete meal entry
router.delete('/food-tracker/meal/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const tracker = await FoodTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Food tracker not found' });
    }
    
    tracker.meals = tracker.meals.filter(meal => meal._id.toString() !== id);
    await tracker.save();
    
    res.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== EXERCISE TRACKER ROUTES ====================

const ExerciseTracker = require('../models/ExerciseTracker');

// Get exercise tracker for user
router.get('/exercise-tracker', auth, async (req, res) => {
  try {
    const tracker = await ExerciseTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.json({ exercises: [], userProfile: null });
    }
    res.json(tracker);
  } catch (error) {
    console.error('Error fetching exercise tracker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create/Update exercise profile
router.post('/exercise-tracker/profile', [
  auth,
  body('age').isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('weight').isFloat({ min: 30, max: 300 }).withMessage('Weight must be between 30 and 300 kg'),
  body('height').isFloat({ min: 100, max: 250 }).withMessage('Height must be between 100 and 250 cm'),
  body('fitnessLevel').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid fitness level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { age, gender, weight, height, fitnessLevel, dailyStepGoal, dailyCalorieGoal } = req.body;
    
    const userProfile = {
      age,
      gender,
      weight,
      height,
      fitnessLevel,
      dailyStepGoal: dailyStepGoal || 10000,
      dailyCalorieGoal: dailyCalorieGoal || 300
    };

    let tracker = await ExerciseTracker.findOne({ userId: req.user.userId });
    
    if (!tracker) {
      tracker = new ExerciseTracker({
        userId: req.user.userId,
        userProfile,
        exercises: []
      });
    } else {
      tracker.userProfile = userProfile;
    }
    
    await tracker.save();
    res.json(tracker);
  } catch (error) {
    console.error('Error updating exercise tracker profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add exercise entry
router.post('/exercise-tracker/exercise', [
  auth,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('exerciseType').isIn(['walking', 'running', 'cycling', 'swimming', 'yoga', 'gym_workout', 'dancing', 'sports', 'stairs', 'household_chores', 'other']).withMessage('Invalid exercise type'),
  body('duration').isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('intensity').isIn(['low', 'moderate', 'high', 'very_high']).withMessage('Invalid intensity level'),
  body('caloriesBurned').isFloat({ min: 0 }).withMessage('Calories burned must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, exerciseType, duration, intensity, steps, caloriesBurned, notes } = req.body;
    
    let tracker = await ExerciseTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Exercise tracker profile not found. Please set up your profile first.' });
    }
    
    const exerciseEntry = {
      date: new Date(date),
      exerciseType,
      duration,
      intensity,
      steps: steps || 0,
      caloriesBurned,
      notes: notes || ''
    };
    
    tracker.exercises.push(exerciseEntry);
    await tracker.save();
    
    res.json({ exercise: exerciseEntry, message: 'Exercise added successfully' });
  } catch (error) {
    console.error('Error adding exercise:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get daily exercise summary
router.get('/exercise-tracker/summary', auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const tracker = await ExerciseTracker.findOne({ userId: req.user.userId });
    if (!tracker) {
      return res.status(404).json({ message: 'Exercise tracker not found' });
    }

    const summary = tracker.getDailySummary(date);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== COGNITIVE ASSESSMENT ROUTES ====================

const CognitiveAssessment = require('../models/CognitiveAssessment');

// Submit cognitive assessment
router.post('/cognitive-assessment', [
  auth,
  body('eyeTest.results').isArray({ min: 5, max: 5 }).withMessage('Eye test must have exactly 5 results'),
  body('eyeTest.totalCorrect').isInt({ min: 0, max: 5 }).withMessage('Eye test correct count must be between 0 and 5'),
  body('eyeTest.averageResponseTime').isFloat({ min: 0 }).withMessage('Average response time must be positive'),
  body('eyeTest.score').isInt({ min: 0, max: 100 }).withMessage('Eye test score must be between 0 and 100'),
  body('brainTest.results').isArray({ min: 3, max: 3 }).withMessage('Brain test must have exactly 3 results'),
  body('brainTest.totalCorrect').isInt({ min: 0, max: 15 }).withMessage('Brain test correct count must be between 0 and 15'),
  body('brainTest.averageResponseTime').isFloat({ min: 0 }).withMessage('Average response time must be positive'),
  body('brainTest.score').isInt({ min: 0, max: 100 }).withMessage('Brain test score must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eyeTest, brainTest } = req.body;
    
    const assessment = new CognitiveAssessment({
      userId: req.user.userId,
      eyeTest,
      brainTest
    });
    
    // Manually call generateInsights to ensure it's executed
    assessment.generateInsights();
    
    await assessment.save();
    res.json(assessment);
  } catch (error) {
    console.error('Error saving cognitive assessment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's cognitive assessment history
router.get('/cognitive-assessment/history', auth, async (req, res) => {
  try {
    const assessments = await CognitiveAssessment.find({ userId: req.user.userId })
      .sort({ date: -1 })
      .limit(10);
    
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching cognitive assessment history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get latest cognitive assessment
router.get('/cognitive-assessment/latest', auth, async (req, res) => {
  try {
    const assessment = await CognitiveAssessment.findOne({ userId: req.user.userId })
      .sort({ date: -1 });
    
    if (!assessment) {
      return res.status(404).json({ message: 'No cognitive assessment found' });
    }
    
    res.json(assessment);
  } catch (error) {
    console.error('Error fetching latest cognitive assessment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;