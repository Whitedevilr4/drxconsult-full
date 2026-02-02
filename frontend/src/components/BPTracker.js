import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const BPTracker = () => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('readings');
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [formData, setFormData] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    notes: '',
    takenAt: new Date().toISOString().slice(0, 16)
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
    saltIntake: 'moderate',
    fatIntake: 'moderate',
    familyHistory: 'no',
    diabetes: 'no',
    heartDisease: 'no',
    dietType: 'mixed'
  });

  useEffect(() => {
    fetchReadings();
  }, []);

  const fetchReadings = async () => {
    try {
      const response = await axios.get('/health-trackers/bp-tracker');
      setReadings(response.data);
    } catch (error) {
      console.error('Error fetching BP readings:', error);
      toast.error('Failed to load BP readings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/health-trackers/bp-tracker', formData);
      toast.success('BP reading added successfully!');
      setShowAddForm(false);
      setFormData({
        systolic: '',
        diastolic: '',
        heartRate: '',
        notes: '',
        takenAt: new Date().toISOString().slice(0, 16)
      });
      fetchReadings();
    } catch (error) {
      console.error('Error adding BP reading:', error);
      toast.error('Failed to add BP reading');
    }
  };

  const deleteReading = async (id) => {
    if (!confirm('Are you sure you want to delete this reading?')) return;
    
    try {
      await axios.delete(`/health-trackers/bp-tracker/${id}`);
      toast.success('Reading deleted successfully!');
      fetchReadings();
    } catch (error) {
      console.error('Error deleting reading:', error);
      toast.error('Failed to delete reading');
    }
  };

  const getBPCategory = (systolic, diastolic) => {
    if (systolic < 90 || diastolic < 60) {
      return { 
        category: 'Low', 
        color: 'text-blue-600 bg-blue-100', 
        advice: 'Consider consulting a doctor if you feel dizzy or weak',
        riskScore: 2,
        severity: 'moderate'
      };
    } else if (systolic < 120 && diastolic < 80) {
      return { 
        category: 'Normal', 
        color: 'text-green-600 bg-green-100', 
        advice: 'Great! Keep maintaining a healthy lifestyle',
        riskScore: 0,
        severity: 'low'
      };
    } else if (systolic < 130 && diastolic < 80) {
      return { 
        category: 'Elevated', 
        color: 'text-yellow-600 bg-yellow-100', 
        advice: 'Focus on lifestyle changes to prevent hypertension',
        riskScore: 1,
        severity: 'low'
      };
    } else if (systolic < 140 || diastolic < 90) {
      return { 
        category: 'Stage 1 High', 
        color: 'text-orange-600 bg-orange-100', 
        advice: 'Consult your doctor about lifestyle changes and possible medication',
        riskScore: 3,
        severity: 'moderate'
      };
    } else if (systolic < 180 || diastolic < 120) {
      return { 
        category: 'Stage 2 High', 
        color: 'text-red-600 bg-red-100', 
        advice: 'See your doctor immediately for treatment',
        riskScore: 4,
        severity: 'high'
      };
    } else {
      return { 
        category: 'Crisis', 
        color: 'text-red-800 bg-red-200', 
        advice: 'Seek emergency medical attention immediately!',
        riskScore: 5,
        severity: 'critical'
      };
    }
  };

  const calculateLifestyleRisk = () => {
    let riskScore = 0;
    const riskFactors = [];
    const protectiveFactors = [];
    const recommendations = [];

    // Age factor
    const age = parseInt(lifestyleData.age);
    if (age >= 65) {
      riskScore += 3;
      riskFactors.push({ factor: 'Age ≥65 years', points: 3, description: 'Higher risk with advancing age' });
    } else if (age >= 45 && lifestyleData.gender === 'male') {
      riskScore += 2;
      riskFactors.push({ factor: 'Male ≥45 years', points: 2, description: 'Increased risk for men over 45' });
    } else if (age >= 55 && lifestyleData.gender === 'female') {
      riskScore += 2;
      riskFactors.push({ factor: 'Female ≥55 years', points: 2, description: 'Increased risk for women over 55' });
    }

    // BMI calculation
    if (lifestyleData.weight && lifestyleData.height) {
      const heightInM = parseFloat(lifestyleData.height) / 100;
      const weightInKg = parseFloat(lifestyleData.weight);
      const bmi = weightInKg / (heightInM * heightInM);
      
      if (bmi >= 30) {
        riskScore += 4;
        riskFactors.push({ factor: `Obesity (BMI: ${bmi.toFixed(1)})`, points: 4, description: 'Significantly increases BP risk' });
        recommendations.push('Weight loss of 5-10% can significantly reduce blood pressure');
      } else if (bmi >= 25) {
        riskScore += 2;
        riskFactors.push({ factor: `Overweight (BMI: ${bmi.toFixed(1)})`, points: 2, description: 'Moderately increases BP risk' });
        recommendations.push('Aim for gradual weight loss through diet and exercise');
      } else if (bmi >= 18.5) {
        protectiveFactors.push({ factor: `Healthy weight (BMI: ${bmi.toFixed(1)})`, description: 'Optimal weight for cardiovascular health' });
      }
    }

    // Smoking
    if (lifestyleData.smokingStatus === 'current') {
      riskScore += 5;
      riskFactors.push({ factor: 'Current smoker', points: 5, description: 'Major cardiovascular risk factor' });
      recommendations.push('Quit smoking immediately - seek professional help if needed');
    } else if (lifestyleData.smokingStatus === 'former') {
      riskScore += 1;
      riskFactors.push({ factor: 'Former smoker', points: 1, description: 'Residual cardiovascular risk' });
    } else {
      protectiveFactors.push({ factor: 'Non-smoker', description: 'Excellent for cardiovascular health' });
    }

    // Alcohol consumption
    if (lifestyleData.alcoholConsumption === 'heavy') {
      riskScore += 3;
      riskFactors.push({ factor: 'Heavy alcohol use', points: 3, description: 'Can raise blood pressure significantly' });
      recommendations.push('Reduce alcohol intake to moderate levels or quit completely');
    } else if (lifestyleData.alcoholConsumption === 'moderate') {
      // Moderate alcohol might be neutral or slightly protective
      protectiveFactors.push({ factor: 'Moderate alcohol use', description: 'May have neutral cardiovascular effects' });
    } else {
      protectiveFactors.push({ factor: 'No alcohol consumption', description: 'Eliminates alcohol-related BP risk' });
    }

    // Exercise
    if (lifestyleData.exerciseFrequency === 'none') {
      riskScore += 3;
      riskFactors.push({ factor: 'Sedentary lifestyle', points: 3, description: 'Lack of exercise increases BP risk' });
      recommendations.push('Start with 30 minutes of moderate exercise 5 days per week');
    } else if (lifestyleData.exerciseFrequency === 'occasional') {
      riskScore += 1;
      riskFactors.push({ factor: 'Insufficient exercise', points: 1, description: 'More regular exercise needed' });
      recommendations.push('Increase exercise frequency to at least 150 minutes per week');
    } else {
      protectiveFactors.push({ factor: 'Regular exercise', description: 'Excellent for blood pressure control' });
    }

    // Stress level
    if (lifestyleData.stressLevel === 'high') {
      riskScore += 2;
      riskFactors.push({ factor: 'High stress levels', points: 2, description: 'Chronic stress can elevate blood pressure' });
      recommendations.push('Practice stress management techniques like meditation, yoga, or counseling');
    } else if (lifestyleData.stressLevel === 'moderate') {
      riskScore += 1;
      riskFactors.push({ factor: 'Moderate stress', points: 1, description: 'Some stress-related BP risk' });
      recommendations.push('Consider stress reduction activities');
    } else {
      protectiveFactors.push({ factor: 'Low stress levels', description: 'Good for cardiovascular health' });
    }

    // Sleep
    if (lifestyleData.sleepHours === '<6' || lifestyleData.sleepHours === '>9') {
      riskScore += 2;
      riskFactors.push({ factor: 'Poor sleep duration', points: 2, description: 'Inadequate or excessive sleep affects BP' });
      recommendations.push('Aim for 7-8 hours of quality sleep per night');
    } else {
      protectiveFactors.push({ factor: 'Adequate sleep', description: 'Good sleep supports healthy blood pressure' });
    }

    // Salt intake
    if (lifestyleData.saltIntake === 'high') {
      riskScore += 3;
      riskFactors.push({ factor: 'High salt intake', points: 3, description: 'Excess sodium directly raises blood pressure' });
      recommendations.push('Reduce sodium intake to less than 2300mg per day (1500mg if possible)');
    } else if (lifestyleData.saltIntake === 'moderate') {
      riskScore += 1;
      riskFactors.push({ factor: 'Moderate salt intake', points: 1, description: 'Could benefit from further reduction' });
      recommendations.push('Consider reducing salt intake further');
    } else {
      protectiveFactors.push({ factor: 'Low salt intake', description: 'Excellent for blood pressure control' });
    }

    // Fat intake
    if (lifestyleData.fatIntake === 'high') {
      riskScore += 2;
      riskFactors.push({ factor: 'High saturated fat intake', points: 2, description: 'Can contribute to cardiovascular risk' });
      recommendations.push('Choose lean proteins and healthy fats (olive oil, nuts, fish)');
    } else if (lifestyleData.fatIntake === 'moderate') {
      // Neutral
    } else {
      protectiveFactors.push({ factor: 'Low saturated fat intake', description: 'Good for heart health' });
    }

    // Family history
    if (lifestyleData.familyHistory === 'yes') {
      riskScore += 2;
      riskFactors.push({ factor: 'Family history of hypertension', points: 2, description: 'Genetic predisposition increases risk' });
      recommendations.push('More frequent monitoring due to genetic risk');
    }

    // Diabetes
    if (lifestyleData.diabetes === 'yes') {
      riskScore += 3;
      riskFactors.push({ factor: 'Diabetes', points: 3, description: 'Diabetes significantly increases cardiovascular risk' });
      recommendations.push('Maintain excellent blood sugar control');
    }

    // Heart disease
    if (lifestyleData.heartDisease === 'yes') {
      riskScore += 4;
      riskFactors.push({ factor: 'Existing heart disease', points: 4, description: 'High cardiovascular risk' });
      recommendations.push('Follow cardiology recommendations strictly');
    }

    // Diet type
    if (lifestyleData.dietType === 'dash') {
      protectiveFactors.push({ factor: 'DASH diet', description: 'Proven to lower blood pressure' });
    } else if (lifestyleData.dietType === 'mediterranean') {
      protectiveFactors.push({ factor: 'Mediterranean diet', description: 'Heart-healthy eating pattern' });
    } else if (lifestyleData.dietType === 'processed') {
      riskScore += 2;
      riskFactors.push({ factor: 'High processed food diet', points: 2, description: 'Increases cardiovascular risk' });
      recommendations.push('Adopt DASH or Mediterranean diet patterns');
    }

    // Determine overall risk level
    let riskLevel = 'Low';
    let riskColor = 'text-green-600';
    let riskBg = 'bg-green-50';
    let riskDescription = '';

    if (riskScore >= 15) {
      riskLevel = 'Very High';
      riskColor = 'text-red-800';
      riskBg = 'bg-red-50';
      riskDescription = 'Multiple high-risk factors present. Immediate medical attention and aggressive lifestyle changes needed.';
    } else if (riskScore >= 10) {
      riskLevel = 'High';
      riskColor = 'text-red-600';
      riskBg = 'bg-red-50';
      riskDescription = 'Several risk factors present. Medical consultation and significant lifestyle changes recommended.';
    } else if (riskScore >= 6) {
      riskLevel = 'Moderate';
      riskColor = 'text-orange-600';
      riskBg = 'bg-orange-50';
      riskDescription = 'Some risk factors present. Lifestyle modifications and regular monitoring recommended.';
    } else if (riskScore >= 3) {
      riskLevel = 'Low-Moderate';
      riskColor = 'text-yellow-600';
      riskBg = 'bg-yellow-50';
      riskDescription = 'Few risk factors present. Focus on prevention and healthy lifestyle maintenance.';
    } else {
      riskLevel = 'Low';
      riskColor = 'text-green-600';
      riskBg = 'bg-green-50';
      riskDescription = 'Excellent lifestyle factors. Continue current healthy habits.';
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
    const assessment = calculateLifestyleRisk();
    setRiskAssessment(assessment);
    toast.success('Risk assessment completed!');
  };

  const generateBPRiskAssessment = () => {

    const recent = readings.slice(0, 7); // Last 7 readings
    let totalRiskScore = 0;
    let highReadings = 0;
    let criticalReadings = 0;
    
    const categoryCount = {
      'Normal': 0,
      'Elevated': 0,
      'Stage 1 High': 0,
      'Stage 2 High': 0,
      'Crisis': 0,
      'Low': 0
    };

    recent.forEach(reading => {
      const category = getBPCategory(reading.systolic, reading.diastolic);
      totalRiskScore += category.riskScore;
      categoryCount[category.category]++;
      
      if (category.severity === 'high' || category.severity === 'critical') {
        highReadings++;
      }
      if (category.severity === 'critical') {
        criticalReadings++;
      }
    });

    const avgRiskScore = totalRiskScore / recent.length;
    let riskLevel = 'Low';
    let riskColor = 'text-green-600';
    let riskBg = 'bg-green-50';
    let recommendations = [];
    let lifestyle = [];
    let medicalActions = [];

    if (avgRiskScore >= 4 || criticalReadings > 0) {
      riskLevel = 'Critical';
      riskColor = 'text-red-800';
      riskBg = 'bg-red-50';
      recommendations = [
        'Seek immediate medical attention',
        'Emergency room visit if readings are consistently >180/120',
        'Do not delay medical care',
        'Monitor blood pressure multiple times daily'
      ];
      medicalActions = [
        'Emergency medical evaluation',
        'Comprehensive cardiovascular assessment',
        'Immediate medication adjustment',
        'Hospital monitoring may be required'
      ];
      lifestyle = [
        'Strict sodium restriction (<1500mg/day)',
        'Complete rest until medical clearance',
        'Avoid strenuous activities',
        'Take medications exactly as prescribed'
      ];
    } else if (avgRiskScore >= 3 || highReadings >= 3) {
      riskLevel = 'High';
      riskColor = 'text-red-600';
      riskBg = 'bg-red-50';
      recommendations = [
        'Schedule urgent appointment with doctor',
        'Consider cardiology consultation',
        'Daily blood pressure monitoring',
        'Medication review and adjustment needed'
      ];
      medicalActions = [
        'Comprehensive cardiovascular evaluation',
        'ECG and echocardiogram',
        'Blood tests: kidney function, electrolytes',
        'Consider antihypertensive medication'
      ];
      lifestyle = [
        'DASH diet implementation',
        'Sodium restriction (<2300mg/day)',
        'Regular moderate exercise (as cleared by doctor)',
        'Weight management if overweight',
        'Stress reduction techniques'
      ];
    } else if (avgRiskScore >= 1.5) {
      riskLevel = 'Moderate';
      riskColor = 'text-orange-600';
      riskBg = 'bg-orange-50';
      recommendations = [
        'Schedule appointment with healthcare provider',
        'Increase monitoring frequency',
        'Focus on lifestyle modifications',
        'Consider home blood pressure monitoring'
      ];
      medicalActions = [
        'Regular blood pressure checks',
        'Basic cardiovascular risk assessment',
        'Lifestyle counseling',
        'Monitor for progression'
      ];
      lifestyle = [
        'Heart-healthy diet (more fruits, vegetables)',
        'Reduce sodium intake',
        'Regular physical activity (150 min/week)',
        'Maintain healthy weight',
        'Limit alcohol consumption'
      ];
    } else {
      riskLevel = 'Low';
      riskColor = 'text-green-600';
      riskBg = 'bg-green-50';
      recommendations = [
        'Continue current healthy habits',
        'Regular monitoring as part of routine care',
        'Maintain healthy lifestyle',
        'Annual check-ups sufficient'
      ];
      medicalActions = [
        'Annual blood pressure screening',
        'Routine cardiovascular health assessment'
      ];
      lifestyle = [
        'Continue balanced diet',
        'Regular exercise routine',
        'Maintain healthy weight',
        'Manage stress effectively'
      ];
    }

    return {
      riskLevel,
      riskColor,
      riskBg,
      avgRiskScore: avgRiskScore.toFixed(1),
      categoryCount,
      recommendations,
      medicalActions,
      lifestyle,
      recentReadings: recent.length,
      highReadings,
      criticalReadings
    };
  };

  const getAverageReadings = () => {
    if (readings.length === 0) return null;
    
    const recent = readings.slice(0, 7); // Last 7 readings
    const avgSystolic = Math.round(recent.reduce((sum, r) => sum + r.systolic, 0) / recent.length);
    const avgDiastolic = Math.round(recent.reduce((sum, r) => sum + r.diastolic, 0) / recent.length);
    const avgHeartRate = Math.round(recent.reduce((sum, r) => sum + (r.heartRate || 0), 0) / recent.length);
    
    return { avgSystolic, avgDiastolic, avgHeartRate };
  };

  const averages = getAverageReadings();
  const bpRiskAssessment = readings.length > 0 ? generateBPRiskAssessment() : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Blood Pressure Tracker</h1>
          <p className="text-gray-600">Monitor your blood pressure and assess cardiovascular risk</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
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
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          BP Readings
        </button>
        <button
          onClick={() => setActiveTab('risk-assessment')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'risk-assessment'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Risk Assessment
        </button>
      </div>

      {/* Add Reading Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add BP Reading</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Systolic (mmHg)
                  </label>
                  <input
                    type="number"
                    value={formData.systolic}
                    onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="60"
                    max="250"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diastolic (mmHg)
                  </label>
                  <input
                    type="number"
                    value={formData.diastolic}
                    onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="40"
                    max="150"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heart Rate (bpm) - Optional
                </label>
                <input
                  type="number"
                  value={formData.heartRate}
                  onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  min="40"
                  max="200"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.takenAt}
                  onChange={(e) => setFormData({ ...formData, takenAt: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows="2"
                  placeholder="e.g., after exercise, morning reading, felt stressed..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
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
            <h2 className="text-2xl font-semibold mb-4">Lifestyle Risk Assessment</h2>
            <p className="text-gray-600 mb-6">
              Complete this assessment to understand your cardiovascular risk factors and get personalized recommendations.
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
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={lifestyleData.gender}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, gender: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Smoking Status</label>
                  <select
                    value={lifestyleData.smokingStatus}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, smokingStatus: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alcohol Consumption</label>
                  <select
                    value={lifestyleData.alcoholConsumption}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, alcoholConsumption: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="none">None</option>
                    <option value="light">Light (1-2 drinks/week)</option>
                    <option value="moderate">Moderate (3-7 drinks/week)</option>
                    <option value="heavy">Heavy (&gt;7 drinks/week)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exercise Frequency</label>
                  <select
                    value={lifestyleData.exerciseFrequency}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, exerciseFrequency: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="none">No regular exercise</option>
                    <option value="occasional">1-2 times per week</option>
                    <option value="moderate">3-4 times per week</option>
                    <option value="frequent">5+ times per week</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stress Level</label>
                  <select
                    value={lifestyleData.stressLevel}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, stressLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="low">Low stress</option>
                    <option value="moderate">Moderate stress</option>
                    <option value="high">High stress</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Hours per Night</label>
                  <select
                    value={lifestyleData.sleepHours}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, sleepHours: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="<6">&lt;6 hours</option>
                    <option value="6-7">6-7 hours</option>
                    <option value="7-8">7-8 hours</option>
                    <option value="8-9">8-9 hours</option>
                    <option value=">9">&gt;9 hours</option>
                  </select>
                </div>
              </div>

              {/* Dietary Factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salt Intake</label>
                  <select
                    value={lifestyleData.saltIntake}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, saltIntake: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="low">Low (rarely add salt, avoid processed foods)</option>
                    <option value="moderate">Moderate (occasional salt, some processed foods)</option>
                    <option value="high">High (frequent salt use, regular processed foods)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Saturated Fat Intake</label>
                  <select
                    value={lifestyleData.fatIntake}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, fatIntake: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="low">Low (lean meats, minimal fried foods)</option>
                    <option value="moderate">Moderate (some fatty meats, occasional fried foods)</option>
                    <option value="high">High (regular fatty meats, frequent fried foods)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diet Type</label>
                <select
                  value={lifestyleData.dietType}
                  onChange={(e) => setLifestyleData({ ...lifestyleData, dietType: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="mixed">Mixed/Standard diet</option>
                  <option value="dash">DASH diet (low sodium, high fruits/vegetables)</option>
                  <option value="mediterranean">Mediterranean diet</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="processed">High processed food diet</option>
                </select>
              </div>

              {/* Medical History */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Family History of Hypertension</label>
                  <select
                    value={lifestyleData.familyHistory}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, familyHistory: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diabetes</label>
                  <select
                    value={lifestyleData.diabetes}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, diabetes: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="no">No</option>
                    <option value="prediabetes">Pre-diabetes</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heart Disease</label>
                  <select
                    value={lifestyleData.heartDisease}
                    onChange={(e) => setLifestyleData({ ...lifestyleData, heartDisease: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Calculate Risk Assessment
              </button>
            </form>
          </div>

          {/* Risk Assessment Results */}
          {riskAssessment && (
            <div className="space-y-6">
              {/* Overall Risk Score */}
              <div className={`${riskAssessment.riskBg} border-l-4 ${riskAssessment.riskLevel === 'Very High' ? 'border-red-800' : riskAssessment.riskLevel === 'High' ? 'border-red-600' : riskAssessment.riskLevel === 'Moderate' ? 'border-orange-500' : riskAssessment.riskLevel === 'Low-Moderate' ? 'border-yellow-500' : 'border-green-500'} rounded-lg p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">Cardiovascular Risk Assessment</h3>
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
                      <h4 className="font-bold text-red-800">HIGH RISK ALERT</h4>
                      <p className="text-red-700 text-sm">
                        Your risk assessment indicates very high cardiovascular risk. Please consult with a healthcare provider immediately 
                        for comprehensive evaluation and management. Do not delay medical care.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* BP Readings Tab */}
      {activeTab === 'readings' && (
        <>
          {readings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">❤️</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No BP readings yet</h2>
              <p className="text-gray-500 mb-4">Start tracking your blood pressure to monitor your health</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Add Your First Reading
              </button>
            </div>
          ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Recent Average (Last 7 readings)</h3>
              {averages && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Blood Pressure:</span>
                    <span className="font-bold text-lg">
                      {averages.avgSystolic}/{averages.avgDiastolic}
                    </span>
                  </div>
                  {averages.avgHeartRate > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Heart Rate:</span>
                      <span className="font-bold">{averages.avgHeartRate} bpm</span>
                    </div>
                  )}
                  <div className="mt-4">
                    {(() => {
                      const category = getBPCategory(averages.avgSystolic, averages.avgDiastolic);
                      return (
                        <div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                            {category.category}
                          </span>
                          <p className="text-sm text-gray-600 mt-2">{category.advice}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* AI Risk Assessment */}
            {bpRiskAssessment && (
              <div className={`${bpRiskAssessment.riskBg} border-l-4 ${bpRiskAssessment.riskLevel === 'Critical' ? 'border-red-800' : bpRiskAssessment.riskLevel === 'High' ? 'border-red-500' : bpRiskAssessment.riskLevel === 'Moderate' ? 'border-orange-500' : 'border-green-500'} rounded-lg p-4 mb-6`}>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  🧠 AI Risk Assessment
                </h3>
                <div className={`text-2xl font-bold ${bpRiskAssessment.riskColor} mb-2`}>
                  {bpRiskAssessment.riskLevel} Risk
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  Based on {bpRiskAssessment.recentReadings} recent readings
                  {bpRiskAssessment.highReadings > 0 && (
                    <span className="text-red-600 font-medium">
                      <br/>{bpRiskAssessment.highReadings} high-risk readings detected
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  <h4 className="font-medium text-gray-800">Reading Distribution:</h4>
                  {Object.entries(bpRiskAssessment.categoryCount).map(([category, count]) => (
                    count > 0 && (
                      <div key={category} className="flex justify-between">
                        <span>{category}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* BP Categories Reference */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">BP Categories</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Normal:</span>
                  <span>&lt;120/80</span>
                </div>
                <div className="flex justify-between">
                  <span>Elevated:</span>
                  <span>120-129/&lt;80</span>
                </div>
                <div className="flex justify-between">
                  <span>Stage 1 High:</span>
                  <span>130-139/80-89</span>
                </div>
                <div className="flex justify-between">
                  <span>Stage 2 High:</span>
                  <span>≥140/≥90</span>
                </div>
                <div className="flex justify-between">
                  <span>Crisis:</span>
                  <span>&gt;180/&gt;120</span>
                </div>
              </div>
            </div>
          </div>

          {/* Readings List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Your BP Readings</h2>
              <div className="space-y-3">
                {readings.map((reading) => {
                  const category = getBPCategory(reading.systolic, reading.diastolic);
                  return (
                    <div
                      key={reading._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="text-xl font-bold text-gray-800">
                            {reading.systolic}/{reading.diastolic}
                          </div>
                          {reading.heartRate && (
                            <div className="text-gray-600">
                              ❤️ {reading.heartRate} bpm
                            </div>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.color}`}>
                            {category.category}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(reading.takenAt).toLocaleString()}
                        </div>
                        {reading.notes && (
                          <div className="text-sm text-gray-500 mt-1">
                            📝 {reading.notes}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteReading(reading._id)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Delete reading"
                      >
                        🗑️
                      </button>
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
      {bpRiskAssessment && bpRiskAssessment.riskLevel !== 'Low' && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            🧠 Detailed AI Risk Assessment & Recommendations
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Medical Actions */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                🏥 Medical Actions Required
              </h4>
              <ul className="space-y-2">
                {bpRiskAssessment.medicalActions.map((action, index) => (
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
                {bpRiskAssessment.recommendations.map((rec, index) => (
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
                {bpRiskAssessment.lifestyle.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span className="text-gray-700 text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Emergency Warning */}
          {bpRiskAssessment.riskLevel === 'Critical' && (
            <div className="mt-6 bg-red-100 border-l-4 border-red-500 p-4">
              <div className="flex items-center">
                <span className="text-red-600 text-2xl mr-3">🚨</span>
                <div>
                  <h4 className="font-bold text-red-800">EMERGENCY ALERT</h4>
                  <p className="text-red-700 text-sm">
                    Your blood pressure readings indicate a medical emergency. Seek immediate medical attention. 
                    Do not wait - go to the emergency room or call emergency services if you experience chest pain, 
                    shortness of breath, severe headache, or vision changes.
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
                  Blood pressure management requires proper medical supervision. Always consult with healthcare providers 
                  for diagnosis and treatment decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medical Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <div>
            <h4 className="font-medium text-yellow-800">Medical Disclaimer</h4>
            <p className="text-yellow-700 text-sm mt-1">
              This risk assessment and blood pressure tracker are for informational purposes only and should not replace professional medical advice. 
              Always consult with healthcare providers for diagnosis, treatment, and medical decisions. Seek immediate medical attention for emergency situations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BPTracker;