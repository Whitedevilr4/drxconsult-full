import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const PeriodPCOSTracker = () => {
  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [pcosResult, setPcosResult] = useState(null);
  
  const [setupData, setSetupData] = useState({
    womanName: '',
    age: '',
    lastPeriodDate: '',
    averageCycleLength: 28
  });

  const [pcosData, setPcosData] = useState({
    age: '',
    height: '',
    weight: '',
    cycleLength: '',
    missedPeriods: '',
    periodsLateOften: '',
    acne: '',
    hairFall: '',
    facialHair: '',
    weightGainRecently: '',
    familyHistoryPCOS: ''
  });

  useEffect(() => {
    fetchTracker();
    
    // Set up daily refresh at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeoutId = setTimeout(() => {
      fetchTracker(); // Refresh data at midnight
      
      // Set up daily interval after first midnight refresh
      const intervalId = setInterval(() => {
        fetchTracker();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(intervalId);
    }, msUntilMidnight);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Populate form with existing data when updating
  useEffect(() => {
    if (tracker && showSetupForm) {
      setSetupData({
        womanName: tracker.womanName || '',
        age: tracker.age || '',
        lastPeriodDate: tracker.lastPeriodDate ? new Date(tracker.lastPeriodDate).toISOString().split('T')[0] : '',
        averageCycleLength: tracker.averageCycleLength || 28
      });
    }
  }, [tracker, showSetupForm]);

  const fetchTracker = async () => {
    try {
      const response = await axios.get('/health-trackers/period-tracker');
      setTracker(response.data);
      if (!response.data) {
        setShowSetupForm(true);
      }
    } catch (error) {
      console.error('Error fetching period tracker:', error);
      setShowSetupForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that last period date is not in the future
    const lastPeriodDate = new Date(setupData.lastPeriodDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    
    if (lastPeriodDate > today) {
      toast.error('Last period date cannot be in the future. Please enter a valid past date.');
      return;
    }
    
    // Validate that the date is not too far in the past (more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (lastPeriodDate < oneYearAgo) {
      toast.error('Last period date seems too far in the past. Please enter a date within the last year.');
      return;
    }
    
    try {
      const response = await axios.post('/health-trackers/period-tracker', setupData);
      setTracker(response.data);
      setShowSetupForm(false);
      toast.success('Period tracker updated successfully!');
    } catch (error) {
      console.error('Error creating period tracker:', error);
      toast.error('Failed to update period tracker');
    }
  };

  const handlePCOSAssessment = () => {
    // Calculate BMI
    const heightInM = parseFloat(pcosData.height) / 100;
    const weightInKg = parseFloat(pcosData.weight);
    const bmi = weightInKg / (heightInM * heightInM);
    
    let score = 0;
    const factors = [];
    
    // Age factor (higher risk in reproductive age)
    const age = parseInt(pcosData.age);
    if (age >= 15 && age <= 35) {
      factors.push({ factor: 'Reproductive age group', points: 1, description: 'Peak risk age for PCOS' });
      score += 1;
    }
    
    // BMI factor
    if (bmi > 25) {
      const points = bmi > 30 ? 3 : 2;
      factors.push({ factor: `BMI: ${bmi.toFixed(1)} (${bmi > 30 ? 'Obese' : 'Overweight'})`, points, description: 'Higher BMI increases PCOS risk' });
      score += points;
    }
    
    // Cycle length (irregular cycles)
    const cycleLength = parseInt(pcosData.cycleLength);
    if (cycleLength > 35 || cycleLength < 21) {
      factors.push({ factor: 'Irregular menstrual cycle', points: 3, description: 'Cycle length outside normal range (21-35 days)' });
      score += 3;
    }
    
    // Missed periods
    if (pcosData.missedPeriods === 'yes') {
      factors.push({ factor: 'Missed periods', points: 3, description: 'Frequent missed periods indicate hormonal imbalance' });
      score += 3;
    }
    
    // Periods late often
    if (pcosData.periodsLateOften === 'yes') {
      factors.push({ factor: 'Periods often late', points: 2, description: 'Irregular timing suggests ovulation issues' });
      score += 2;
    }
    
    // Acne severity
    if (pcosData.acne === 'mild') {
      factors.push({ factor: 'Mild acne', points: 1, description: 'Hormonal acne is common in PCOS' });
      score += 1;
    } else if (pcosData.acne === 'severe') {
      factors.push({ factor: 'Severe acne', points: 2, description: 'Severe acne indicates significant hormonal imbalance' });
      score += 2;
    }
    
    // Hair fall
    if (pcosData.hairFall === 'yes') {
      factors.push({ factor: 'Hair fall/thinning', points: 2, description: 'Male-pattern hair loss due to excess androgens' });
      score += 2;
    }
    
    // Facial hair (hirsutism)
    if (pcosData.facialHair === 'yes') {
      factors.push({ factor: 'Excess facial hair', points: 3, description: 'Hirsutism is a key sign of elevated androgens' });
      score += 3;
    }
    
    // Recent weight gain
    if (pcosData.weightGainRecently === 'yes') {
      factors.push({ factor: 'Recent weight gain', points: 2, description: 'Unexplained weight gain is common in PCOS' });
      score += 2;
    }
    
    // Family history
    if (pcosData.familyHistoryPCOS === 'yes') {
      factors.push({ factor: 'Family history of PCOS', points: 2, description: 'Genetic predisposition increases risk' });
      score += 2;
    }
    
    // Determine risk level and recommendations
    let riskLevel = 'Low';
    let riskColor = 'text-green-600';
    let riskBg = 'bg-green-50';
    let recommendations = [];
    let suggestedTests = [];
    let lifestyle = [];
    
    if (score >= 9) {
      riskLevel = 'High';
      riskColor = 'text-red-600';
      riskBg = 'bg-red-50';
      recommendations = [
        'Consult a gynecologist immediately',
        'Consider seeing an endocrinologist',
        'Discuss fertility planning if relevant',
        'Monitor for diabetes and cardiovascular risks'
      ];
      suggestedTests = [
        'Pelvic ultrasound (USG pelvis)',
        'Hormonal tests: LH/FSH ratio, testosterone',
        'Fasting insulin and glucose tolerance test',
        'Lipid profile and HbA1c'
      ];
      lifestyle = [
        'Follow a low-glycemic index diet',
        'Regular exercise (150 min/week)',
        'Weight management if overweight',
        'Stress management techniques',
        'Regular sleep schedule (7-8 hours)'
      ];
    } else if (score >= 5) {
      riskLevel = 'Moderate';
      riskColor = 'text-orange-600';
      riskBg = 'bg-orange-50';
      recommendations = [
        'Schedule appointment with gynecologist',
        'Monitor symptoms closely',
        'Consider lifestyle modifications',
        'Track menstrual cycles regularly'
      ];
      suggestedTests = [
        'Basic hormonal panel: LH, FSH, testosterone',
        'Pelvic ultrasound if symptoms persist',
        'Fasting glucose and insulin levels'
      ];
      lifestyle = [
        'Maintain healthy weight',
        'Regular physical activity',
        'Balanced diet with whole foods',
        'Limit processed foods and sugar',
        'Manage stress levels'
      ];
    } else {
      riskLevel = 'Low';
      riskColor = 'text-green-600';
      riskBg = 'bg-green-50';
      recommendations = [
        'Continue monitoring your health',
        'Maintain healthy lifestyle habits',
        'Regular gynecological check-ups',
        'Be aware of symptom changes'
      ];
      suggestedTests = [
        'Annual routine gynecological exam',
        'Basic health screening as per age'
      ];
      lifestyle = [
        'Continue healthy diet and exercise',
        'Regular menstrual cycle tracking',
        'Maintain healthy weight',
        'Stay hydrated and get adequate sleep'
      ];
    }

    setPcosResult({
      riskLevel,
      riskColor,
      riskBg,
      score,
      maxScore: 23, // Maximum possible score
      riskPercentage: Math.round((score / 23) * 100),
      bmi: bmi.toFixed(1),
      factors,
      recommendations,
      suggestedTests,
      lifestyle
    });
  };

  const calculateNextPeriod = (lastPeriodDate, cycleLength) => {
    const lastPeriod = new Date(lastPeriodDate);
    const nextPeriod = new Date(lastPeriod);
    nextPeriod.setDate(lastPeriod.getDate() + cycleLength);
    return nextPeriod;
  };

  const calculateOvulation = (lastPeriodDate, cycleLength) => {
    const lastPeriod = new Date(lastPeriodDate);
    const ovulation = new Date(lastPeriod);
    // Ovulation typically occurs 14 days before the next period
    ovulation.setDate(lastPeriod.getDate() + (cycleLength - 14));
    return ovulation;
  };

  const getDaysUntil = (targetDate) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today for accurate day calculation
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0); // Set to start of target date
    const diffTime = target - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const markPeriodStarted = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatedData = {
        ...tracker,
        lastPeriodDate: today
      };
      
      const response = await axios.post('/health-trackers/period-tracker', updatedData);
      setTracker(response.data);
      toast.success('Period marked as started! Cycle updated.');
    } catch (error) {
      console.error('Error updating period start:', error);
      toast.error('Failed to update period start');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (showSetupForm) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Setup Period & PCOS Tracker</h1>
          <form onSubmit={handleSetupSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={setupData.womanName}
                  onChange={(e) => setSetupData({ ...setupData, womanName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={setupData.age}
                  onChange={(e) => setSetupData({ ...setupData, age: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  min="12"
                  max="60"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Period Date
                </label>
                <input
                  type="date"
                  value={setupData.lastPeriodDate}
                  onChange={(e) => setSetupData({ ...setupData, lastPeriodDate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  max={new Date().toISOString().split('T')[0]} // Prevent future dates
                  min={new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]} // Limit to 1 year ago
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the start date of your most recent period</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Average Cycle Length (days)
                </label>
                <input
                  type="number"
                  value={setupData.averageCycleLength}
                  onChange={(e) => setSetupData({ ...setupData, averageCycleLength: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  min="21"
                  max="35"
                  required
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                type="submit"
                className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Create Tracker
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!tracker) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🌸</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No period tracker found</h2>
        <p className="text-gray-500 mb-4">Set up your period tracker to get started</p>
        <button
          onClick={() => setShowSetupForm(true)}
          className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Setup Tracker
        </button>
      </div>
    );
  }

  const nextPeriod = calculateNextPeriod(tracker.lastPeriodDate, tracker.averageCycleLength);
  const ovulationDate = calculateOvulation(tracker.lastPeriodDate, tracker.averageCycleLength);
  const daysUntilPeriod = getDaysUntil(nextPeriod);
  const daysUntilOvulation = getDaysUntil(ovulationDate);
  
  // Calculate current cycle day
  const lastPeriodDate = new Date(tracker.lastPeriodDate);
  const today = new Date();
  const daysSinceLastPeriod = Math.floor((today - lastPeriodDate) / (1000 * 60 * 60 * 24)) + 1;
  const currentCycleDay = daysSinceLastPeriod > tracker.averageCycleLength ? 
    daysSinceLastPeriod % tracker.averageCycleLength || tracker.averageCycleLength : 
    daysSinceLastPeriod;

  // Determine cycle phase
  const getCyclePhase = (cycleDay, cycleLength) => {
    if (cycleDay <= 5) {
      return { phase: 'Menstrual', color: 'text-red-600', bg: 'bg-red-50', description: 'Period days' };
    } else if (cycleDay <= (cycleLength - 14 - 2)) {
      return { phase: 'Follicular', color: 'text-blue-600', bg: 'bg-blue-50', description: 'Pre-ovulation phase' };
    } else if (cycleDay >= (cycleLength - 14 - 2) && cycleDay <= (cycleLength - 14 + 2)) {
      return { phase: 'Ovulation', color: 'text-green-600', bg: 'bg-green-50', description: 'Fertile window' };
    } else {
      return { phase: 'Luteal', color: 'text-purple-600', bg: 'bg-purple-50', description: 'Post-ovulation phase' };
    }
  };

  const currentPhase = getCyclePhase(currentCycleDay, tracker.averageCycleLength);

  // Debug logging (remove in production)
  console.log('Period Tracker Debug:', {
    lastPeriodDate: tracker.lastPeriodDate,
    cycleLength: tracker.averageCycleLength,
    nextPeriod: nextPeriod.toLocaleDateString(),
    ovulationDate: ovulationDate.toLocaleDateString(),
    daysUntilPeriod,
    daysUntilOvulation,
    currentCycleDay,
    daysSinceLastPeriod,
    today: new Date().toLocaleDateString()
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Period & PCOS Tracker</h1>
        <p className="text-gray-600">Track your menstrual cycle and assess PCOS risk</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('pcos-assessment')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pcos-assessment'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            PCOS Assessment
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Status */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Hello, {tracker.womanName}!</h2>
              
              {/* Cycle Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Cycle Progress</span>
                  <span className="text-sm text-gray-600">Day {currentCycleDay} of {tracker.averageCycleLength}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-pink-400 to-purple-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((currentCycleDay / tracker.averageCycleLength) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Period</span>
                  <span>Ovulation</span>
                  <span>Next Period</span>
                </div>
                
                {/* Current Phase */}
                <div className={`mt-3 p-2 rounded-lg ${currentPhase.bg}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${currentPhase.color}`}>{currentPhase.phase} Phase</span>
                    <span className="text-sm text-gray-600">{currentPhase.description}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-pink-50 p-4 rounded-lg">
                  <div className="text-pink-600 text-2xl font-bold">
                    {daysUntilPeriod > 0 ? daysUntilPeriod : 
                     daysUntilPeriod === 0 ? 'Today!' : 
                     `${Math.abs(daysUntilPeriod)} days late`}
                  </div>
                  <div className="text-pink-800 font-medium">
                    {daysUntilPeriod > 0 ? 'Days until next period' : 
                     daysUntilPeriod === 0 ? 'Period expected today' : 
                     'Period is late'}
                  </div>
                  <div className="text-pink-600 text-sm">
                    Expected: {nextPeriod.toLocaleDateString()}
                  </div>
                  {daysUntilPeriod <= 0 && (
                    <button
                      onClick={markPeriodStarted}
                      className="mt-2 bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Mark Period Started
                    </button>
                  )}
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-purple-600 text-2xl font-bold">
                    {daysUntilOvulation > 0 ? daysUntilOvulation : 
                     daysUntilOvulation === 0 ? 'Today' : 
                     `${Math.abs(daysUntilOvulation)} days ago`}
                  </div>
                  <div className="text-purple-800 font-medium">
                    {daysUntilOvulation > 0 ? 'Days until ovulation' : 
                     daysUntilOvulation === 0 ? 'Ovulation today' : 
                     'Ovulation was'}
                  </div>
                  <div className="text-purple-600 text-sm">
                    Expected: {ovulationDate.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Cycle Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Cycle Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Period:</span>
                  <span className="font-medium">{new Date(tracker.lastPeriodDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cycle Length:</span>
                  <span className="font-medium">{tracker.averageCycleLength} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span className="font-medium">{tracker.age} years</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('pcos-assessment')}
                  className="w-full bg-pink-100 hover:bg-pink-200 text-pink-800 py-2 px-4 rounded-lg transition-colors text-left"
                >
                  <div className="font-medium">PCOS Assessment</div>
                  <div className="text-sm">Check your risk factors</div>
                </button>
                <button
                  onClick={() => setShowSetupForm(true)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg transition-colors text-left"
                >
                  <div className="font-medium">Update Information</div>
                  <div className="text-sm">Modify your tracker data</div>
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-blue-800 mb-2">💡 Tracking Tips</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Track symptoms daily for better predictions</li>
                <li>• Note any irregularities in your cycle</li>
                <li>• Regular exercise can help regulate cycles</li>
                <li>• Consult a doctor for persistent issues</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* PCOS Assessment Tab */}
      {activeTab === 'pcos-assessment' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">PCOS Risk Assessment</h2>
            <p className="text-gray-600 mb-6">
              Please provide the following information for a comprehensive PCOS risk assessment. This is a screening tool and should not replace professional medical advice.
            </p>

            {!pcosResult ? (
              <div>
                <div className="space-y-6 mb-8">
                  {/* Basic Information */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-4">📋 Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Age (years)</label>
                        <input
                          type="number"
                          value={pcosData.age}
                          onChange={(e) => setPcosData({ ...pcosData, age: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          min="10"
                          max="60"
                          placeholder="e.g., 25"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                        <input
                          type="number"
                          value={pcosData.height}
                          onChange={(e) => setPcosData({ ...pcosData, height: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          min="100"
                          max="220"
                          placeholder="e.g., 160"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                        <input
                          type="number"
                          value={pcosData.weight}
                          onChange={(e) => setPcosData({ ...pcosData, weight: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          min="30"
                          max="200"
                          placeholder="e.g., 55"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Menstrual History */}
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-pink-800 mb-4">🌸 Menstrual History</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Typical cycle length (days)</label>
                        <input
                          type="number"
                          value={pcosData.cycleLength}
                          onChange={(e) => setPcosData({ ...pcosData, cycleLength: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          min="15"
                          max="60"
                          placeholder="e.g., 28"
                        />
                        <p className="text-xs text-gray-500 mt-1">Normal range: 21-35 days</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">Do you miss periods often?</label>
                          <div className="space-y-2">
                            {['yes', 'no'].map((option) => (
                              <label key={option} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name="missedPeriods"
                                  value={option}
                                  checked={pcosData.missedPeriods === option}
                                  onChange={(e) => setPcosData({ ...pcosData, missedPeriods: e.target.value })}
                                  className="w-4 h-4 text-pink-600 focus:ring-pink-500"
                                />
                                <span className="text-sm capitalize">{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">Are your periods often late?</label>
                          <div className="space-y-2">
                            {['yes', 'no'].map((option) => (
                              <label key={option} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name="periodsLateOften"
                                  value={option}
                                  checked={pcosData.periodsLateOften === option}
                                  onChange={(e) => setPcosData({ ...pcosData, periodsLateOften: e.target.value })}
                                  className="w-4 h-4 text-pink-600 focus:ring-pink-500"
                                />
                                <span className="text-sm capitalize">{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Physical Symptoms */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-4">👤 Physical Symptoms</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Acne condition</label>
                        <div className="space-y-2">
                          {[
                            { value: 'none', label: 'None or very mild' },
                            { value: 'mild', label: 'Mild (occasional breakouts)' },
                            { value: 'severe', label: 'Severe (persistent, cystic)' }
                          ].map((option) => (
                            <label key={option.value} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="acne"
                                value={option.value}
                                checked={pcosData.acne === option.value}
                                onChange={(e) => setPcosData({ ...pcosData, acne: e.target.value })}
                                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Hair fall or thinning</label>
                        <div className="space-y-2">
                          {['yes', 'no'].map((option) => (
                            <label key={option} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="hairFall"
                                value={option}
                                checked={pcosData.hairFall === option}
                                onChange={(e) => setPcosData({ ...pcosData, hairFall: e.target.value })}
                                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm capitalize">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Excess facial hair</label>
                        <div className="space-y-2">
                          {['yes', 'no'].map((option) => (
                            <label key={option} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="facialHair"
                                value={option}
                                checked={pcosData.facialHair === option}
                                onChange={(e) => setPcosData({ ...pcosData, facialHair: e.target.value })}
                                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm capitalize">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Recent weight gain</label>
                        <div className="space-y-2">
                          {['yes', 'no'].map((option) => (
                            <label key={option} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="weightGainRecently"
                                value={option}
                                checked={pcosData.weightGainRecently === option}
                                onChange={(e) => setPcosData({ ...pcosData, weightGainRecently: e.target.value })}
                                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm capitalize">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Family History */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-4">👨‍👩‍👧‍👦 Family History</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Family history of PCOS/PCOD (mother, sister, aunt)
                      </label>
                      <div className="space-y-2">
                        {['yes', 'no', 'unknown'].map((option) => (
                          <label key={option} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="familyHistoryPCOS"
                              value={option}
                              checked={pcosData.familyHistoryPCOS === option}
                              onChange={(e) => setPcosData({ ...pcosData, familyHistoryPCOS: e.target.value })}
                              className="w-4 h-4 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm capitalize">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handlePCOSAssessment}
                    disabled={!pcosData.age || !pcosData.height || !pcosData.weight || !pcosData.cycleLength}
                    className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                  >
                    🧠 Get AI Risk Assessment
                  </button>
                  <button
                    onClick={() => setPcosData({
                      age: '', height: '', weight: '', cycleLength: '',
                      missedPeriods: '', periodsLateOften: '', acne: '',
                      hairFall: '', facialHair: '', weightGainRecently: '',
                      familyHistoryPCOS: ''
                    })}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Risk Assessment Results */}
                <div className={`${pcosResult.riskBg} border-l-4 ${pcosResult.riskLevel === 'High' ? 'border-red-500' : pcosResult.riskLevel === 'Moderate' ? 'border-orange-500' : 'border-green-500'} rounded-lg p-6 mb-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className={`text-3xl font-bold ${pcosResult.riskColor}`}>
                        {pcosResult.riskLevel} Risk
                      </div>
                      <div className="text-sm text-gray-600">
                        Score: {pcosResult.score}/{pcosResult.maxScore} ({pcosResult.riskPercentage}%)
                      </div>
                      <div className="text-sm text-gray-600">
                        BMI: {pcosResult.bmi} {parseFloat(pcosResult.bmi) > 25 ? '(Overweight)' : parseFloat(pcosResult.bmi) > 30 ? '(Obese)' : '(Normal)'}
                      </div>
                    </div>
                    <div className="text-4xl">
                      {pcosResult.riskLevel === 'High' ? '⚠️' : pcosResult.riskLevel === 'Moderate' ? '⚡' : '✅'}
                    </div>
                  </div>
                  
                  {/* Risk Factors */}
                  {pcosResult.factors.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-3">📊 Contributing Risk Factors:</h4>
                      <div className="space-y-2">
                        {pcosResult.factors.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                            <div>
                              <span className="font-medium text-gray-800">{factor.factor}</span>
                              <p className="text-xs text-gray-600">{factor.description}</p>
                            </div>
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                              +{factor.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Medical Recommendations */}
                  <div className="bg-white border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                      🏥 Medical Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {pcosResult.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-red-600 mt-1">•</span>
                          <span className="text-gray-700 text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested Tests */}
                  <div className="bg-white border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                      🔬 Suggested Tests
                    </h4>
                    <ul className="space-y-2">
                      {pcosResult.suggestedTests.map((test, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span className="text-gray-700 text-sm">{test}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Lifestyle Recommendations */}
                  <div className="bg-white border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                      🌱 Lifestyle Changes
                    </h4>
                    <ul className="space-y-2">
                      {pcosResult.lifestyle.map((tip, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span className="text-gray-700 text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Important Disclaimer */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-600 text-xl">⚠️</span>
                    <div>
                      <h4 className="font-medium text-yellow-800">Important Medical Disclaimer</h4>
                      <p className="text-yellow-700 text-sm mt-1">
                        <strong>This is a screening tool, not a medical diagnosis.</strong> This assessment is based on common PCOS symptoms and risk factors. Only a qualified healthcare provider can diagnose PCOS through proper medical examination and tests. Please consult with a gynecologist or endocrinologist for accurate diagnosis and treatment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setPcosResult(null)}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Take Assessment Again
                  </button>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg transition-colors"
                  >
                    Back to Overview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodPCOSTracker;