import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const DiabetesTracker = () => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('readings');
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [formData, setFormData] = useState({
    glucoseLevel: '',
    readingType: 'fasting',
    notes: '',
    takenAt: new Date().toISOString().slice(0, 16),
    medication: '',
    carbs: '',
    exercise: ''
  });

  const [lifestyleData, setLifestyleData] = useState({
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    smokingStatus: 'never',
    alcoholConsumption: 'none',
    exerciseFrequency: 'none',
    stressLevel: 'low',
    sleepHours: '7-8',
    dietType: 'mixed',
    familyHistoryDiabetes: 'no',
    familyHistoryHeartDisease: 'no',
    highBloodPressure: 'no',
    cholesterolLevels: 'normal',
    physicalActivity: 'sedentary',
    fastFoodFrequency: 'rarely',
    sugarIntake: 'moderate',
    medicationAdherence: 'always',
    glucoseMonitoring: 'daily',
    diabetesType: 'type2',
    diagnosisYears: '0-1'
  });

  useEffect(() => {
    fetchReadings();
  }, []);

  const fetchReadings = async () => {
    try {
      const response = await axios.get('/health-trackers/diabetes-tracker');
      setReadings(response.data);
    } catch (error) {
      console.error('Error fetching diabetes readings:', error);
      toast.error('Failed to load diabetes readings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/health-trackers/diabetes-tracker', formData);
      toast.success('Glucose reading added successfully!');
      setShowAddForm(false);
      setFormData({
        glucoseLevel: '',
        readingType: 'fasting',
        notes: '',
        takenAt: new Date().toISOString().slice(0, 16),
        medication: '',
        carbs: '',
        exercise: ''
      });
      fetchReadings();
    } catch (error) {
      console.error('Error adding glucose reading:', error);
      toast.error('Failed to add glucose reading');
    }
  };

  const deleteReading = async (id) => {
    if (!confirm('Are you sure you want to delete this reading?')) return;
    
    try {
      await axios.delete(`/health-trackers/diabetes-tracker/${id}`);
      toast.success('Reading deleted successfully!');
      fetchReadings();
    } catch (error) {
      console.error('Error deleting reading:', error);
      toast.error('Failed to delete reading');
    }
  };

  const getGlucoseCategory = (level, type) => {
    const ranges = {
      fasting: {
        normal: [70, 99],
        prediabetes: [100, 125],
        diabetes: [126, 400]
      },
      postMeal: {
        normal: [70, 139],
        prediabetes: [140, 199],
        diabetes: [200, 400]
      },
      random: {
        normal: [70, 139],
        prediabetes: [140, 199],
        diabetes: [200, 400]
      },
      bedtime: {
        normal: [100, 140],
        prediabetes: [141, 180],
        diabetes: [181, 400]
      }
    };

    const range = ranges[type] || ranges.random;
    
    if (level < range.normal[0]) {
      return { 
        category: 'Low', 
        color: 'text-blue-600 bg-blue-100', 
        advice: 'Consider eating something. Consult your doctor if this happens frequently.',
        riskScore: 3,
        severity: 'moderate'
      };
    } else if (level <= range.normal[1]) {
      return { 
        category: 'Normal', 
        color: 'text-green-600 bg-green-100', 
        advice: 'Great! Keep maintaining your current management plan.',
        riskScore: 0,
        severity: 'low'
      };
    } else if (level <= range.prediabetes[1]) {
      return { 
        category: 'Pre-diabetes', 
        color: 'text-yellow-600 bg-yellow-100', 
        advice: 'Consider lifestyle changes and consult your healthcare provider.',
        riskScore: 2,
        severity: 'moderate'
      };
    } else if (level <= 250) {
      return { 
        category: 'High', 
        color: 'text-red-600 bg-red-100', 
        advice: 'Consult your healthcare provider about adjusting your treatment plan.',
        riskScore: 3,
        severity: 'high'
      };
    } else {
      return { 
        category: 'Very High', 
        color: 'text-red-800 bg-red-200', 
        advice: 'Seek immediate medical attention. This level requires urgent care.',
        riskScore: 5,
        severity: 'critical'
      };
    }
  };

  const calculateDiabetesLifestyleRisk = () => {
    let riskScore = 0;
    const riskFactors = [];
    const protectiveFactors = [];
    const recommendations = [];

    // Age factor
    const age = parseInt(lifestyleData.age);
    if (age >= 65) {
      riskScore += 3;
      riskFactors.push({ factor: 'Age ≥65 years', points: 3, description: 'Higher diabetes complication risk with age' });
    } else if (age >= 45) {
      riskScore += 2;
      riskFactors.push({ factor: 'Age ≥45 years', points: 2, description: 'Increased diabetes risk with age' });
    }

    // BMI calculation
    if (lifestyleData.weight && lifestyleData.height) {
      const heightInM = parseFloat(lifestyleData.height) / 100;
      const weightInKg = parseFloat(lifestyleData.weight);
      const bmi = weightInKg / (heightInM * heightInM);
      
      if (bmi >= 30) {
        riskScore += 4;
        riskFactors.push({ factor: `Obesity (BMI: ${bmi.toFixed(1)})`, points: 4, description: 'Significantly worsens diabetes control' });
        recommendations.push('Weight loss of 5-10% can dramatically improve blood sugar control');
      } else if (bmi >= 25) {
        riskScore += 2;
        riskFactors.push({ factor: `Overweight (BMI: ${bmi.toFixed(1)})`, points: 2, description: 'Makes diabetes management more difficult' });
        recommendations.push('Gradual weight loss through diet and exercise');
      } else if (bmi >= 18.5) {
        protectiveFactors.push({ factor: `Healthy weight (BMI: ${bmi.toFixed(1)})`, description: 'Optimal for diabetes management' });
      }
    }

    // Smoking
    if (lifestyleData.smokingStatus === 'current') {
      riskScore += 5;
      riskFactors.push({ factor: 'Current smoker', points: 5, description: 'Dramatically increases diabetes complications' });
      recommendations.push('Quit smoking immediately - increases risk of heart disease, stroke, and kidney disease');
    } else if (lifestyleData.smokingStatus === 'former') {
      riskScore += 1;
      riskFactors.push({ factor: 'Former smoker', points: 1, description: 'Some residual cardiovascular risk' });
    } else {
      protectiveFactors.push({ factor: 'Non-smoker', description: 'Reduces diabetes complication risk' });
    }

    // Alcohol consumption
    if (lifestyleData.alcoholConsumption === 'heavy') {
      riskScore += 3;
      riskFactors.push({ factor: 'Heavy alcohol use', points: 3, description: 'Can cause dangerous blood sugar swings' });
      recommendations.push('Reduce alcohol intake - can interfere with diabetes medications');
    } else if (lifestyleData.alcoholConsumption === 'moderate') {
      riskScore += 1;
      riskFactors.push({ factor: 'Moderate alcohol use', points: 1, description: 'Monitor blood sugar carefully when drinking' });
    } else {
      protectiveFactors.push({ factor: 'No alcohol consumption', description: 'Eliminates alcohol-related blood sugar complications' });
    }

    // Exercise
    if (lifestyleData.exerciseFrequency === 'none') {
      riskScore += 4;
      riskFactors.push({ factor: 'Sedentary lifestyle', points: 4, description: 'Exercise is crucial for diabetes management' });
      recommendations.push('Start with 30 minutes of walking 5 days per week');
    } else if (lifestyleData.exerciseFrequency === 'occasional') {
      riskScore += 2;
      riskFactors.push({ factor: 'Insufficient exercise', points: 2, description: 'More regular activity needed for optimal control' });
      recommendations.push('Increase to at least 150 minutes of moderate exercise per week');
    } else {
      protectiveFactors.push({ factor: 'Regular exercise', description: 'Excellent for blood sugar control and insulin sensitivity' });
    }

    // Stress level
    if (lifestyleData.stressLevel === 'high') {
      riskScore += 3;
      riskFactors.push({ factor: 'High stress levels', points: 3, description: 'Chronic stress raises blood sugar levels' });
      recommendations.push('Practice stress management - meditation, yoga, or counseling');
    } else if (lifestyleData.stressLevel === 'moderate') {
      riskScore += 1;
      riskFactors.push({ factor: 'Moderate stress', points: 1, description: 'Some stress-related blood sugar impact' });
    } else {
      protectiveFactors.push({ factor: 'Low stress levels', description: 'Good for stable blood sugar control' });
    }

    // Sleep
    if (lifestyleData.sleepHours === '<6' || lifestyleData.sleepHours === '>9') {
      riskScore += 2;
      riskFactors.push({ factor: 'Poor sleep duration', points: 2, description: 'Affects insulin sensitivity and glucose control' });
      recommendations.push('Aim for 7-8 hours of quality sleep per night');
    } else {
      protectiveFactors.push({ factor: 'Adequate sleep', description: 'Supports healthy glucose metabolism' });
    }

    // Diet type
    if (lifestyleData.dietType === 'processed') {
      riskScore += 3;
      riskFactors.push({ factor: 'High processed food diet', points: 3, description: 'Causes blood sugar spikes and poor control' });
      recommendations.push('Adopt a diabetes-friendly diet with whole foods');
    } else if (lifestyleData.dietType === 'diabetic') {
      protectiveFactors.push({ factor: 'Diabetic diet plan', description: 'Excellent for blood sugar management' });
    } else if (lifestyleData.dietType === 'mediterranean') {
      protectiveFactors.push({ factor: 'Mediterranean diet', description: 'Heart-healthy and diabetes-friendly' });
    }

    // Sugar intake
    if (lifestyleData.sugarIntake === 'high') {
      riskScore += 4;
      riskFactors.push({ factor: 'High sugar intake', points: 4, description: 'Directly worsens blood sugar control' });
      recommendations.push('Drastically reduce added sugars and sugary drinks');
    } else if (lifestyleData.sugarIntake === 'moderate') {
      riskScore += 2;
      riskFactors.push({ factor: 'Moderate sugar intake', points: 2, description: 'Could benefit from further reduction' });
      recommendations.push('Continue reducing sugar intake for better control');
    } else {
      protectiveFactors.push({ factor: 'Low sugar intake', description: 'Excellent for diabetes management' });
    }

    // Fast food frequency
    if (lifestyleData.fastFoodFrequency === 'daily') {
      riskScore += 3;
      riskFactors.push({ factor: 'Daily fast food consumption', points: 3, description: 'High in calories, carbs, and unhealthy fats' });
      recommendations.push('Replace fast food with home-cooked meals');
    } else if (lifestyleData.fastFoodFrequency === 'weekly') {
      riskScore += 2;
      riskFactors.push({ factor: 'Weekly fast food consumption', points: 2, description: 'Frequent fast food affects blood sugar' });
      recommendations.push('Limit fast food to special occasions only');
    } else if (lifestyleData.fastFoodFrequency === 'monthly') {
      riskScore += 1;
      riskFactors.push({ factor: 'Monthly fast food consumption', points: 1, description: 'Occasional impact on blood sugar' });
    } else {
      protectiveFactors.push({ factor: 'Rarely eats fast food', description: 'Good for consistent blood sugar control' });
    }

    // Family history
    if (lifestyleData.familyHistoryDiabetes === 'yes') {
      riskScore += 2;
      riskFactors.push({ factor: 'Family history of diabetes', points: 2, description: 'Genetic predisposition to complications' });
      recommendations.push('More aggressive management due to genetic risk');
    }

    if (lifestyleData.familyHistoryHeartDisease === 'yes') {
      riskScore += 2;
      riskFactors.push({ factor: 'Family history of heart disease', points: 2, description: 'Higher cardiovascular risk with diabetes' });
      recommendations.push('Focus on heart-healthy lifestyle choices');
    }

    // High blood pressure
    if (lifestyleData.highBloodPressure === 'yes') {
      riskScore += 3;
      riskFactors.push({ factor: 'High blood pressure', points: 3, description: 'Doubles cardiovascular risk with diabetes' });
      recommendations.push('Strict blood pressure control is essential');
    }

    // Cholesterol levels
    if (lifestyleData.cholesterolLevels === 'high') {
      riskScore += 2;
      riskFactors.push({ factor: 'High cholesterol', points: 2, description: 'Increases heart disease risk with diabetes' });
      recommendations.push('Work with doctor to manage cholesterol levels');
    } else if (lifestyleData.cholesterolLevels === 'normal') {
      protectiveFactors.push({ factor: 'Normal cholesterol levels', description: 'Good for cardiovascular health' });
    }

    // Medication adherence
    if (lifestyleData.medicationAdherence === 'never') {
      riskScore += 5;
      riskFactors.push({ factor: 'Poor medication adherence', points: 5, description: 'Critical for diabetes control' });
      recommendations.push('Take medications exactly as prescribed - set reminders if needed');
    } else if (lifestyleData.medicationAdherence === 'sometimes') {
      riskScore += 3;
      riskFactors.push({ factor: 'Inconsistent medication adherence', points: 3, description: 'Leads to poor blood sugar control' });
      recommendations.push('Improve medication consistency - discuss barriers with doctor');
    } else {
      protectiveFactors.push({ factor: 'Excellent medication adherence', description: 'Essential for optimal diabetes management' });
    }

    // Glucose monitoring
    if (lifestyleData.glucoseMonitoring === 'rarely') {
      riskScore += 3;
      riskFactors.push({ factor: 'Infrequent glucose monitoring', points: 3, description: 'Cannot manage what you do not measure' });
      recommendations.push('Increase monitoring frequency as recommended by doctor');
    } else if (lifestyleData.glucoseMonitoring === 'weekly') {
      riskScore += 2;
      riskFactors.push({ factor: 'Weekly glucose monitoring', points: 2, description: 'May miss important patterns' });
      recommendations.push('Consider more frequent monitoring for better control');
    } else {
      protectiveFactors.push({ factor: 'Regular glucose monitoring', description: 'Key to successful diabetes management' });
    }

    // Years since diagnosis
    const diagnosisYears = lifestyleData.diagnosisYears;
    if (diagnosisYears === '10+') {
      riskScore += 2;
      riskFactors.push({ factor: 'Long-term diabetes (10+ years)', points: 2, description: 'Higher risk of complications over time' });
      recommendations.push('Regular screening for diabetes complications');
    } else if (diagnosisYears === '5-10') {
      riskScore += 1;
      riskFactors.push({ factor: 'Moderate-term diabetes (5-10 years)', points: 1, description: 'Increasing complication risk' });
    }

    // Determine overall risk level
    let riskLevel = 'Low';
    let riskColor = 'text-green-600';
    let riskBg = 'bg-green-50';
    let riskDescription = '';

    if (riskScore >= 20) {
      riskLevel = 'Very High';
      riskColor = 'text-red-800';
      riskBg = 'bg-red-50';
      riskDescription = 'Multiple high-risk factors present. Immediate comprehensive diabetes management review needed.';
    } else if (riskScore >= 15) {
      riskLevel = 'High';
      riskColor = 'text-red-600';
      riskBg = 'bg-red-50';
      riskDescription = 'Several risk factors present. Aggressive lifestyle changes and medical management needed.';
    } else if (riskScore >= 10) {
      riskLevel = 'Moderate';
      riskColor = 'text-orange-600';
      riskBg = 'bg-orange-50';
      riskDescription = 'Some risk factors present. Focus on lifestyle improvements and consistent management.';
    } else if (riskScore >= 5) {
      riskLevel = 'Low-Moderate';
      riskColor = 'text-yellow-600';
      riskBg = 'bg-yellow-50';
      riskDescription = 'Few risk factors present. Continue current management with minor improvements.';
    } else {
      riskLevel = 'Low';
      riskColor = 'text-green-600';
      riskBg = 'bg-green-50';
      riskDescription = 'Excellent diabetes management factors. Continue current healthy habits.';
    }

    return {
      riskScore,
      riskLevel,
      riskColor,
      riskBg,
      riskDescription,
      riskFactors,
      protectiveFactors,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };
  };

  const handleLifestyleSubmit = (e) => {
    e.preventDefault();
    const assessment = calculateDiabetesLifestyleRisk();
    setRiskAssessment(assessment);
    toast.success('Diabetes risk assessment completed!');
  };

  const generateDiabetesRiskAssessment = () => {
    if (readings.length === 0) return null;

    const recent = readings.slice(0, 14); // Last 14 readings
    let totalRiskScore = 0;
    let highReadings = 0;
    let criticalReadings = 0;
    let lowReadings = 0;
    
    const categoryCount = {
      'Normal': 0,
      'Pre-diabetes': 0,
      'High': 0,
      'Very High': 0,
      'Low': 0
    };

    const typeAnalysis = {
      'fasting': { total: 0, high: 0, avg: 0 },
      'postMeal': { total: 0, high: 0, avg: 0 },
      'random': { total: 0, high: 0, avg: 0 },
      'bedtime': { total: 0, high: 0, avg: 0 }
    };

    recent.forEach(reading => {
      const category = getGlucoseCategory(reading.glucoseLevel, reading.readingType);
      totalRiskScore += category.riskScore;
      categoryCount[category.category]++;
      
      // Track by reading type
      if (typeAnalysis[reading.readingType]) {
        typeAnalysis[reading.readingType].total++;
        typeAnalysis[reading.readingType].avg += reading.glucoseLevel;
        if (category.severity === 'high' || category.severity === 'critical') {
          typeAnalysis[reading.readingType].high++;
        }
      }
      
      if (category.severity === 'high' || category.severity === 'critical') {
        highReadings++;
      }
      if (category.severity === 'critical') {
        criticalReadings++;
      }
      if (category.category === 'Low') {
        lowReadings++;
      }
    });

    // Calculate averages by type
    Object.keys(typeAnalysis).forEach(type => {
      if (typeAnalysis[type].total > 0) {
        typeAnalysis[type].avg = Math.round(typeAnalysis[type].avg / typeAnalysis[type].total);
      }
    });

    const avgRiskScore = totalRiskScore / recent.length;
    let riskLevel = 'Low';
    let riskColor = 'text-green-600';
    let riskBg = 'bg-green-50';
    let recommendations = [];
    let lifestyle = [];
    let medicalActions = [];
    let emergencyActions = [];

    if (avgRiskScore >= 4 || criticalReadings > 2) {
      riskLevel = 'Critical';
      riskColor = 'text-red-800';
      riskBg = 'bg-red-50';
      emergencyActions = [
        'Seek immediate medical attention',
        'Contact your endocrinologist urgently',
        'Consider emergency room visit if >400 mg/dL',
        'Check for ketones if diabetic'
      ];
      medicalActions = [
        'Immediate medication adjustment',
        'Comprehensive diabetes management review',
        'HbA1c and kidney function tests',
        'Possible hospitalization for stabilization'
      ];
      lifestyle = [
        'Strict adherence to prescribed medications',
        'Frequent blood glucose monitoring',
        'Avoid high-carb foods completely',
        'Stay hydrated but avoid sugary drinks'
      ];
    } else if (avgRiskScore >= 2.5 || highReadings >= 5) {
      riskLevel = 'High';
      riskColor = 'text-red-600';
      riskBg = 'bg-red-50';
      recommendations = [
        'Schedule urgent appointment with endocrinologist',
        'Increase monitoring frequency',
        'Review and adjust medications',
        'Consider continuous glucose monitoring'
      ];
      medicalActions = [
        'Comprehensive diabetes evaluation',
        'HbA1c, lipid profile, kidney function tests',
        'Medication optimization',
        'Diabetic complications screening'
      ];
      lifestyle = [
        'Strict carbohydrate counting',
        'Regular meal timing',
        'Moderate exercise as approved by doctor',
        'Weight management if needed'
      ];
    } else if (avgRiskScore >= 1.5 || lowReadings >= 3) {
      riskLevel = 'Moderate';
      riskColor = 'text-orange-600';
      riskBg = 'bg-orange-50';
      recommendations = [
        'Schedule appointment with healthcare provider',
        'Review current management plan',
        'Consider medication timing adjustments',
        'Increase self-monitoring'
      ];
      medicalActions = [
        'Routine diabetes management review',
        'HbA1c monitoring',
        'Medication adherence assessment',
        'Lifestyle counseling'
      ];
      lifestyle = [
        'Consistent meal planning',
        'Regular physical activity',
        'Stress management',
        'Adequate sleep (7-8 hours)'
      ];
    } else {
      riskLevel = 'Low';
      riskColor = 'text-green-600';
      riskBg = 'bg-green-50';
      recommendations = [
        'Continue current management plan',
        'Regular monitoring as prescribed',
        'Maintain healthy lifestyle',
        'Routine follow-ups with healthcare team'
      ];
      medicalActions = [
        'Regular diabetes check-ups',
        'Annual comprehensive diabetes evaluation',
        'Preventive care screening'
      ];
      lifestyle = [
        'Continue balanced diet',
        'Regular exercise routine',
        'Maintain healthy weight',
        'Stress management'
      ];
    }

    return {
      riskLevel,
      riskColor,
      riskBg,
      avgRiskScore: avgRiskScore.toFixed(1),
      categoryCount,
      typeAnalysis,
      recommendations,
      medicalActions,
      lifestyle,
      emergencyActions,
      recentReadings: recent.length,
      highReadings,
      criticalReadings,
      lowReadings
    };
  };

  const getAverageReadings = () => {
    if (readings.length === 0) return null;
    
    const recent = readings.slice(0, 14); // Last 14 readings
    const avgGlucose = Math.round(recent.reduce((sum, r) => sum + r.glucoseLevel, 0) / recent.length);
    
    const byType = recent.reduce((acc, reading) => {
      if (!acc[reading.readingType]) acc[reading.readingType] = [];
      acc[reading.readingType].push(reading.glucoseLevel);
      return acc;
    }, {});

    const avgByType = Object.entries(byType).map(([type, values]) => ({
      type,
      average: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length),
      count: values.length
    }));
    
    return { avgGlucose, avgByType };
  };

  const averages = getAverageReadings();
  const diabetesRiskAssessment = generateDiabetesRiskAssessment();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Diabetes Tracker</h1>
          <p className="text-gray-600">Monitor your glucose levels, assess diabetes risk, and manage your condition effectively</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Reading
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('readings')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'readings'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Glucose Readings
        </button>
        <button
          onClick={() => setActiveTab('risk-assessment')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'risk-assessment'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Risk Assessment
        </button>
      </div>

      {/* Add Reading Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Glucose Reading</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Glucose Level (mg/dL)
                </label>
                <input
                  type="number"
                  value={formData.glucoseLevel}
                  onChange={(e) => setFormData({ ...formData, glucoseLevel: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="40"
                  max="600"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reading Type
                </label>
                <select
                  value={formData.readingType}
                  onChange={(e) => setFormData({ ...formData, readingType: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="fasting">Fasting (8+ hours)</option>
                  <option value="postMeal">Post-meal (2 hours after eating)</option>
                  <option value="random">Random</option>
                  <option value="bedtime">Bedtime</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.takenAt}
                  onChange={(e) => setFormData({ ...formData, takenAt: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medication Taken (Optional)
                </label>
                <input
                  type="text"
                  value={formData.medication}
                  onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Metformin 500mg, Insulin 10 units"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carbs Consumed (g) - Optional
                </label>
                <input
                  type="number"
                  value={formData.carbs}
                  onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                  max="500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exercise (Optional)
                </label>
                <input
                  type="text"
                  value={formData.exercise}
                  onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 30 min walk, gym workout"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="2"
                  placeholder="How are you feeling? Any symptoms?"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Reading
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Risk Assessment Tab */}
      {activeTab === 'risk-assessment' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Diabetes Lifestyle Risk Assessment</h2>
            <p className="text-gray-600 mb-6">
              Complete this comprehensive assessment to understand your diabetes risk factors and get personalized recommendations for better management.
            </p>

            <form onSubmit={handleLifestyleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    min="18"
                    max="120"
                    value={lifestyleData.age}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, age: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={lifestyleData.gender}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, gender: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={lifestyleData.weight}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, weight: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={lifestyleData.height}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, height: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diabetes Type</label>
                  <select
                    value={lifestyleData.diabetesType}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, diabetesType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="type1">Type 1 Diabetes</option>
                    <option value="type2">Type 2 Diabetes</option>
                    <option value="gestational">Gestational Diabetes</option>
                    <option value="prediabetes">Pre-diabetes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years Since Diagnosis</label>
                  <select
                    value={lifestyleData.diagnosisYears}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, diagnosisYears: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="0-1">Less than 1 year</option>
                    <option value="1-5">1-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">More than 10 years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Smoking Status</label>
                  <select
                    value={lifestyleData.smokingStatus}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, smokingStatus: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="never">Never smoked</option>
                    <option value="former">Former smoker</option>
                    <option value="current">Current smoker</option>
                  </select>
                </div>
              </div>

              {/* Lifestyle Factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exercise Frequency</label>
                  <select
                    value={lifestyleData.exerciseFrequency}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, exerciseFrequency: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="none">No regular exercise</option>
                    <option value="occasional">1-2 times per week</option>
                    <option value="moderate">3-4 times per week</option>
                    <option value="frequent">5+ times per week</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stress Level</label>
                  <select
                    value={lifestyleData.stressLevel}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, stressLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="low">Low stress</option>
                    <option value="moderate">Moderate stress</option>
                    <option value="high">High stress</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Hours per Night</label>
                  <select
                    value={lifestyleData.sleepHours}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, sleepHours: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="<6">&lt;6 hours</option>
                    <option value="6-7">6-7 hours</option>
                    <option value="7-8">7-8 hours</option>
                    <option value="8-9">8-9 hours</option>
                    <option value=">9">&gt;9 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alcohol Consumption</label>
                  <select
                    value={lifestyleData.alcoholConsumption}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, alcoholConsumption: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="none">None</option>
                    <option value="light">Light (1-2 drinks/week)</option>
                    <option value="moderate">Moderate (3-7 drinks/week)</option>
                    <option value="heavy">Heavy (&gt;7 drinks/week)</option>
                  </select>
                </div>
              </div>

              {/* Dietary Factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diet Type</label>
                  <select
                    value={lifestyleData.dietType}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, dietType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="mixed">Mixed/Standard diet</option>
                    <option value="diabetic">Diabetic diet plan</option>
                    <option value="mediterranean">Mediterranean diet</option>
                    <option value="low-carb">Low-carb diet</option>
                    <option value="processed">High processed food diet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sugar Intake</label>
                  <select
                    value={lifestyleData.sugarIntake}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, sugarIntake: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="low">Low (avoid added sugars)</option>
                    <option value="moderate">Moderate (occasional sweets)</option>
                    <option value="high">High (regular sugary foods/drinks)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fast Food Frequency</label>
                <select
                  value={lifestyleData.fastFoodFrequency}
                  onChange={(e) => setLifestyleData({ ...lifestyleData, fastFoodFrequency: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="rarely">Rarely (less than once/month)</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              {/* Medical History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Family History of Diabetes</label>
                  <select
                    value={lifestyleData.familyHistoryDiabetes}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, familyHistoryDiabetes: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Family History of Heart Disease</label>
                  <select
                    value={lifestyleData.familyHistoryHeartDisease}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, familyHistoryHeartDisease: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">High Blood Pressure</label>
                  <select
                    value={lifestyleData.highBloodPressure}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, highBloodPressure: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cholesterol Levels</label>
                  <select
                    value={lifestyleData.cholesterolLevels}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, cholesterolLevels: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="normal">Normal</option>
                    <option value="borderline">Borderline high</option>
                    <option value="high">High</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Management Factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medication Adherence</label>
                  <select
                    value={lifestyleData.medicationAdherence}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, medicationAdherence: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="always">Always take as prescribed</option>
                    <option value="usually">Usually take as prescribed</option>
                    <option value="sometimes">Sometimes miss doses</option>
                    <option value="never">Rarely take medications</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Glucose Monitoring Frequency</label>
                  <select
                    value={lifestyleData.glucoseMonitoring}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, glucoseMonitoring: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="rarely">Rarely</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Calculate Diabetes Risk Assessment
              </button>
            </form>
          </div>

          {/* Risk Assessment Results */}
          {riskAssessment && (
            <div className="space-y-6">
              {/* Overall Risk Score */}
              <div className={`${riskAssessment.riskBg} border-l-4 ${riskAssessment.riskLevel === 'Very High' ? 'border-red-800' : riskAssessment.riskLevel === 'High' ? 'border-red-600' : riskAssessment.riskLevel === 'Moderate' ? 'border-orange-500' : riskAssessment.riskLevel === 'Low-Moderate' ? 'border-yellow-500' : 'border-green-500'} rounded-lg p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">Diabetes Risk Assessment</h3>
                  <div className={`text-3xl font-bold ${riskAssessment.riskColor}`}>
                    {riskAssessment.riskLevel} Risk
                  </div>
                </div>
                <p className="text-gray-700 mb-4">{riskAssessment.riskDescription}</p>
                <div className="text-sm text-gray-600">
                  Risk Score: {riskAssessment.riskScore} points
                </div>
              </div>

              {/* Risk Factors and Protective Factors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Factors */}
                {riskAssessment.riskFactors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-red-800 mb-4">⚠️ Risk Factors</h4>
                    <div className="space-y-3">
                      {riskAssessment.riskFactors.map((factor, index) => (
                        <div key={index} className="border-b border-red-200 pb-2 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-red-800">{factor.factor}</span>
                            <span className="text-red-600 font-bold">+{factor.points}</span>
                          </div>
                          <p className="text-sm text-red-700 mt-1">{factor.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Protective Factors */}
                {riskAssessment.protectiveFactors.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-green-800 mb-4">✅ Protective Factors</h4>
                    <div className="space-y-3">
                      {riskAssessment.protectiveFactors.map((factor, index) => (
                        <div key={index} className="border-b border-green-200 pb-2 last:border-b-0">
                          <span className="font-medium text-green-800">{factor.factor}</span>
                          <p className="text-sm text-green-700 mt-1">{factor.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {riskAssessment.recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-blue-800 mb-4">💡 Personalized Recommendations</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {riskAssessment.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-blue-800 text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Warning for Very High Risk */}
              {riskAssessment.riskLevel === 'Very High' && (
                <div className="bg-red-100 border-l-4 border-red-500 p-4">
                  <div className="flex items-center">
                    <span className="text-red-600 text-2xl mr-3">🚨</span>
                    <div>
                      <h4 className="font-bold text-red-800">HIGH DIABETES RISK ALERT</h4>
                      <p className="text-red-700 text-sm">
                        Your risk assessment indicates very high diabetes complication risk. Please consult with your healthcare provider immediately 
                        for comprehensive diabetes management review. Aggressive lifestyle changes and medical management are needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Glucose Readings Tab */}
      {activeTab === 'readings' && (
        <>
          {readings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🩺</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No glucose readings yet</h2>
          <p className="text-gray-500 mb-4">Start tracking your glucose levels to manage your diabetes</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Your First Reading
          </button>
        </div>
          ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Recent Average (Last 14 readings)</h3>
              {averages && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{averages.avgGlucose}</div>
                    <div className="text-gray-600">mg/dL</div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700">By Reading Type:</h4>
                    {averages.avgByType.map(({ type, average, count }) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="capitalize">{type.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="font-medium">{average} mg/dL ({count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Risk Assessment */}
            {diabetesRiskAssessment && (
              <div className={`${diabetesRiskAssessment.riskBg} border-l-4 ${diabetesRiskAssessment.riskLevel === 'Critical' ? 'border-red-800' : diabetesRiskAssessment.riskLevel === 'High' ? 'border-red-500' : diabetesRiskAssessment.riskLevel === 'Moderate' ? 'border-orange-500' : 'border-green-500'} rounded-lg p-4 mb-6`}>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  🧠 AI Diabetes Risk Assessment
                </h3>
                <div className={`text-2xl font-bold ${diabetesRiskAssessment.riskColor} mb-2`}>
                  {diabetesRiskAssessment.riskLevel} Risk
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  Based on {diabetesRiskAssessment.recentReadings} recent readings
                  {diabetesRiskAssessment.highReadings > 0 && (
                    <span className="text-red-600 font-medium">
                      <br/>{diabetesRiskAssessment.highReadings} high-risk readings
                    </span>
                  )}
                  {diabetesRiskAssessment.lowReadings > 0 && (
                    <span className="text-blue-600 font-medium">
                      <br/>{diabetesRiskAssessment.lowReadings} low glucose episodes
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  <h4 className="font-medium text-gray-800">Reading Distribution:</h4>
                  {Object.entries(diabetesRiskAssessment.categoryCount).map(([category, count]) => (
                    count > 0 && (
                      <div key={category} className="flex justify-between">
                        <span>{category}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    )
                  ))}
                </div>

                {/* Type Analysis */}
                <div className="mt-4 space-y-2 text-sm">
                  <h4 className="font-medium text-gray-800">Average by Type:</h4>
                  {Object.entries(diabetesRiskAssessment.typeAnalysis).map(([type, data]) => (
                    data.total > 0 && (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="font-medium">
                          {data.avg} mg/dL ({data.total} readings)
                          {data.high > 0 && <span className="text-red-600 ml-1">⚠️{data.high}</span>}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Glucose Ranges Reference */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Target Ranges (mg/dL)</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium">Fasting:</div>
                  <div className="text-gray-600">Normal: 70-99</div>
                  <div className="text-gray-600">Pre-diabetes: 100-125</div>
                  <div className="text-gray-600">Diabetes: ≥126</div>
                </div>
                <div>
                  <div className="font-medium">Post-meal (2hr):</div>
                  <div className="text-gray-600">Normal: &lt;140</div>
                  <div className="text-gray-600">Pre-diabetes: 140-199</div>
                  <div className="text-gray-600">Diabetes: ≥200</div>
                </div>
              </div>
            </div>
          </div>

          {/* Readings List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Your Glucose Readings</h2>
              <div className="space-y-3">
                {readings.map((reading) => {
                  const category = getGlucoseCategory(reading.glucoseLevel, reading.readingType);
                  return (
                    <div
                      key={reading._id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl font-bold text-gray-800">
                            {reading.glucoseLevel} <span className="text-sm font-normal">mg/dL</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.color}`}>
                            {category.category}
                          </span>
                          <span className="text-sm text-gray-600 capitalize">
                            {reading.readingType.replace(/([A-Z])/g, ' $1')}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteReading(reading._id)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Delete reading"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {new Date(reading.takenAt).toLocaleString()}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        {reading.medication && (
                          <div className="text-gray-600">
                            💊 {reading.medication}
                          </div>
                        )}
                        {reading.carbs && (
                          <div className="text-gray-600">
                            🍞 {reading.carbs}g carbs
                          </div>
                        )}
                        {reading.exercise && (
                          <div className="text-gray-600">
                            🏃 {reading.exercise}
                          </div>
                        )}
                      </div>
                      
                      {reading.notes && (
                        <div className="text-sm text-gray-500 mt-2">
                          📝 {reading.notes}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                        💡 {category.advice}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
          )}
        </>
      )}

      {/* AI Risk Assessment Details */}
      {diabetesRiskAssessment && diabetesRiskAssessment.riskLevel !== 'Low' && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            🧠 Detailed AI Diabetes Risk Assessment & Recommendations
          </h3>
          
          {/* Emergency Actions for Critical Risk */}
          {diabetesRiskAssessment.emergencyActions && diabetesRiskAssessment.emergencyActions.length > 0 && (
            <div className="mb-6 bg-red-100 border-l-4 border-red-500 p-4">
              <div className="flex items-center mb-3">
                <span className="text-red-600 text-2xl mr-3">🚨</span>
                <h4 className="font-bold text-red-800">URGENT MEDICAL ATTENTION REQUIRED</h4>
              </div>
              <ul className="space-y-1">
                {diabetesRiskAssessment.emergencyActions.map((action, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span className="text-red-700 text-sm font-medium">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Medical Actions */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                🏥 Medical Actions Required
              </h4>
              <ul className="space-y-2">
                {diabetesRiskAssessment.medicalActions.map((action, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span className="text-gray-700 text-sm">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Immediate Recommendations */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                ⚡ Immediate Actions
              </h4>
              <ul className="space-y-2">
                {diabetesRiskAssessment.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <span className="text-gray-700 text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Lifestyle Changes */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                🌱 Lifestyle Modifications
              </h4>
              <ul className="space-y-2">
                {diabetesRiskAssessment.lifestyle.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span className="text-gray-700 text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Hypoglycemia Warning */}
          {diabetesRiskAssessment.lowReadings > 0 && (
            <div className="mt-6 bg-blue-100 border-l-4 border-blue-500 p-4">
              <div className="flex items-center">
                <span className="text-blue-600 text-2xl mr-3">⚠️</span>
                <div>
                  <h4 className="font-bold text-blue-800">Low Blood Sugar Alert</h4>
                  <p className="text-blue-700 text-sm">
                    You've had {diabetesRiskAssessment.lowReadings} low glucose episodes recently. This can be dangerous. 
                    Always carry glucose tablets or quick-acting carbs. Discuss with your doctor about adjusting 
                    medications or meal timing to prevent hypoglycemia.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Medical Disclaimer */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div>
                <h4 className="font-medium text-yellow-800">Medical Disclaimer</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  This AI assessment is for informational purposes only and should not replace professional medical advice. 
                  Diabetes management requires proper medical supervision. Always consult with your healthcare team 
                  for treatment decisions and medication adjustments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Tips */}
      <div className="mt-8 bg-green-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-4">💡 Diabetes Management Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-green-800">Lifestyle Management:</h4>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Follow a consistent meal schedule</li>
              <li>• Count carbohydrates in your meals</li>
              <li>• Exercise regularly (aim for 150 min/week)</li>
              <li>• Stay hydrated with water</li>
              <li>• Get adequate sleep (7-9 hours)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-green-800">Monitoring Tips:</h4>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Test at consistent times daily</li>
              <li>• Keep a log of readings and patterns</li>
              <li>• Note factors affecting glucose levels</li>
              <li>• Share data with your healthcare team</li>
              <li>• Check feet daily for any issues</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiabetesTracker;