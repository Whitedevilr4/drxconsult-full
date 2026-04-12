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
      const response = await axios.post('/health-trackers/period-tracker/log-cycle', {
        startDate: today
      });
      setTracker(response.data);
      toast.success('Period marked as started! Cycle logged.');
    } catch (error) {
      console.error('Error updating period start:', error);
      toast.error('Failed to update period start');
    }
  };

  const deletePeriodRecord = async (periodId) => {
    if (!confirm('Delete this cycle record?')) return;
    try {
      const response = await axios.delete(`/health-trackers/period-tracker/period/${periodId}`);
      setTracker(response.data.tracker);
      toast.success('Record deleted.');
    } catch (error) {
      console.error('Error deleting period record:', error);
      toast.error('Failed to delete record');
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
          <button
            onClick={() => setActiveTab('cycle-history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cycle-history'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cycle History
          </button>
          <button
            onClick={() => setActiveTab('ai-insights')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ai-insights'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🤖 AI Insights
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
      {/* Cycle History Tab */}
      {activeTab === 'cycle-history' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Cycle History</h2>
            {(!tracker.periods || tracker.periods.length === 0) ? (
              <div className="text-center py-10 text-gray-500">
                <div className="text-4xl mb-3">🌸</div>
                <p>No cycle records yet.</p>
                <p className="text-sm mt-1">Click "Mark Period Started" on the Overview tab to log your first cycle.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...tracker.periods].reverse().map((record) => {
                  const daysLate = record.daysLate ?? null;
                  let statusLabel, statusClass;
                  if (daysLate === null || record.expectedDate == null) {
                    statusLabel = 'Logged';
                    statusClass = 'bg-gray-100 text-gray-600';
                  } else if (daysLate > 0) {
                    statusLabel = `Late by ${daysLate} day${daysLate > 1 ? 's' : ''}`;
                    statusClass = 'bg-red-100 text-red-700';
                  } else if (daysLate < 0) {
                    statusLabel = `Early by ${Math.abs(daysLate)} day${Math.abs(daysLate) > 1 ? 's' : ''}`;
                    statusClass = 'bg-blue-100 text-blue-700';
                  } else {
                    statusLabel = 'On time';
                    statusClass = 'bg-green-100 text-green-700';
                  }

                  return (
                    <div key={record._id} className="flex items-center justify-between border rounded-lg p-4">
                      <div>
                        <div className="font-medium text-gray-800">
                          {new Date(record.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        {record.expectedDate && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Expected: {new Date(record.expectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        )}
                        {record.flow && record.flow !== 'normal' && (
                          <div className="text-xs text-gray-500 capitalize mt-0.5">Flow: {record.flow}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusClass}`}>
                          {statusLabel}
                        </span>
                        <button
                          onClick={() => deletePeriodRecord(record._id)}
                          className="text-red-400 hover:text-red-600 transition-colors text-sm"
                          title="Delete record"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* AI Insights Tab */}
      {activeTab === 'ai-insights' && (() => {
        const periods = tracker?.periods || [];
        const hasCycles = periods.length >= 1;

        // --- Compute cycle gaps between consecutive logged periods ---
        const sorted = [...periods].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
          const diff = Math.round(
            (new Date(sorted[i].startDate) - new Date(sorted[i - 1].startDate)) / (1000 * 60 * 60 * 24)
          );
          if (diff > 0 && diff < 90) gaps.push(diff);
        }
        const avgActualCycle = gaps.length
          ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
          : tracker.averageCycleLength;

        // --- Lateness analysis ---
        const lateRecords = periods.filter(p => p.daysLate != null && p.daysLate > 0);
        const earlyRecords = periods.filter(p => p.daysLate != null && p.daysLate < 0);
        const onTimeRecords = periods.filter(p => p.daysLate != null && p.daysLate === 0);
        const avgLate = lateRecords.length
          ? (lateRecords.reduce((a, b) => a + b.daysLate, 0) / lateRecords.length).toFixed(1)
          : 0;
        const latePercent = periods.length
          ? Math.round((lateRecords.length / periods.length) * 100)
          : 0;

        // --- PCOD / PCOS risk from cycle data ---
        const irregularCycle = avgActualCycle < 21 || avgActualCycle > 35;
        const frequentlyLate = latePercent >= 50;
        const highLateDays = parseFloat(avgLate) >= 5;

        let riskLevel = 'Low';
        let riskColor = 'text-green-600';
        let riskBg = 'bg-green-50 border-green-200';
        let riskIcon = '✅';
        let riskSignals = [];

        if (irregularCycle) {
          riskSignals.push(`Average cycle of ${avgActualCycle} days is outside the normal 21–35 day range`);
        }
        if (frequentlyLate) {
          riskSignals.push(`${latePercent}% of your periods arrived late — frequent delays suggest hormonal irregularity`);
        }
        if (highLateDays) {
          riskSignals.push(`Average lateness of ${avgLate} days per cycle may indicate ovulation issues`);
        }
        if (lateRecords.length >= 2 && avgActualCycle > 35) {
          riskSignals.push('Consistently long cycles combined with late periods are a key PCOS indicator');
        }

        if (riskSignals.length >= 3) {
          riskLevel = 'Moderate–High';
          riskColor = 'text-red-600';
          riskBg = 'bg-red-50 border-red-200';
          riskIcon = '⚠️';
        } else if (riskSignals.length >= 1) {
          riskLevel = 'Moderate';
          riskColor = 'text-orange-600';
          riskBg = 'bg-orange-50 border-orange-200';
          riskIcon = '⚡';
        }

        // --- Cycle regularity score (0–100) ---
        const regularityScore = gaps.length
          ? Math.max(0, Math.round(100 - (gaps.reduce((acc, g) => acc + Math.abs(g - avgActualCycle), 0) / gaps.length) * 5))
          : null;

        return (
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🤖</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">AI Cycle Insights</h2>
                  <p className="text-gray-500 text-sm">Personalised analysis based on your cycle history</p>
                </div>
              </div>
              {!hasCycles && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
                  ℹ️ No cycle records logged yet. Log at least one period from the Overview tab to unlock full insights.
                </div>
              )}
            </div>

            {/* Cycle Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cycles Logged', value: periods.length, icon: '📅', color: 'text-pink-600', bg: 'bg-pink-50' },
                { label: 'Avg Cycle Length', value: `${avgActualCycle} days`, icon: '🔄', color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Times Late', value: lateRecords.length, icon: '⏰', color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'On Time', value: onTimeRecords.length, icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Regularity Score */}
            {regularityScore !== null && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-3">📊 Cycle Regularity Score</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${
                          regularityScore >= 70 ? 'bg-green-500' : regularityScore >= 40 ? 'bg-orange-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(regularityScore, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Irregular</span><span>Regular</span>
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${regularityScore >= 70 ? 'text-green-600' : regularityScore >= 40 ? 'text-orange-500' : 'text-red-600'}`}>
                    {regularityScore}%
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {regularityScore >= 70
                    ? 'Your cycles are fairly regular — great sign of hormonal balance.'
                    : regularityScore >= 40
                    ? 'Some variation in your cycles. Monitor closely and consider a gynaecologist visit.'
                    : 'High cycle variability detected. This warrants a medical evaluation.'}
                </p>
              </div>
            )}

            {/* PCOD / PCOS Risk from Cycle Data */}
            <div className={`border rounded-xl p-5 ${riskBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{riskIcon}</span>
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">PCOD / PCOS Risk Indicator</h3>
                  <p className={`font-bold text-xl ${riskColor}`}>{riskLevel} Risk</p>
                </div>
              </div>

              {riskSignals.length > 0 ? (
                <div className="space-y-2 mb-3">
                  <p className="text-sm font-medium text-gray-700">Signals detected from your cycle data:</p>
                  {riskSignals.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white bg-opacity-60 rounded-lg p-2">
                      <span className="text-red-500 mt-0.5">⚡</span>
                      <span className="text-sm text-gray-700">{s}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-700 mb-3">
                  No major irregularity signals found in your cycle history. Keep tracking consistently for more accurate insights.
                </p>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                ⚠️ This is a pattern-based indicator only, not a clinical diagnosis. Use the <strong>PCOS Assessment</strong> tab for a full symptom-based evaluation and consult a gynaecologist for confirmation.
              </div>
            </div>

            {/* Lateness Pattern */}
            {periods.length >= 2 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-4">📈 Lateness Pattern</h3>
                <div className="space-y-2">
                  {[...sorted].reverse().slice(0, 6).map((record, i) => {
                    const late = record.daysLate ?? null;
                    const barWidth = late == null ? 0 : Math.min(Math.abs(late) * 10, 100);
                    const isLate = late > 0;
                    const isEarly = late < 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24 shrink-0">
                          {new Date(record.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                          <div
                            className={`h-3 rounded-full ${isLate ? 'bg-red-400' : isEarly ? 'bg-blue-400' : 'bg-green-400'}`}
                            style={{ width: late === 0 ? '8px' : `${barWidth}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium w-20 text-right ${isLate ? 'text-red-600' : isEarly ? 'text-blue-600' : 'text-green-600'}`}>
                          {late === null ? '—' : late === 0 ? 'On time' : isLate ? `+${late}d late` : `${Math.abs(late)}d early`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Health Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Hormonal & Cycle Health */}
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-5">
                <h3 className="font-semibold text-pink-800 mb-3">🌸 Hormonal & Cycle Health</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    'Eat a low-glycemic diet — reduce refined sugar and white carbs to balance insulin and hormones.',
                    'Include omega-3 rich foods (flaxseeds, walnuts, fish) to reduce inflammation linked to PCOS.',
                    'Aim for 7–8 hours of sleep — poor sleep disrupts cortisol and estrogen balance.',
                    'Manage stress with yoga, meditation or deep breathing — chronic stress raises cortisol and disrupts ovulation.',
                    'Avoid skipping meals; irregular eating patterns worsen hormonal fluctuations.',
                    irregularCycle
                      ? '⚡ Your cycle length is irregular — consider consulting a gynaecologist for a hormonal panel.'
                      : 'Your cycle length looks within normal range — keep tracking to maintain this.',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-pink-500 mt-0.5 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sanitary & Hygiene Tips */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                <h3 className="font-semibold text-purple-800 mb-3">🧴 Sanitary & Hygiene Tips</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    'Change sanitary pads every 4–6 hours and tampons every 4–8 hours to prevent bacterial growth.',
                    'Wash the external genital area with plain water — avoid scented soaps or douching.',
                    'Wear breathable cotton underwear during your period to reduce moisture and irritation.',
                    'Dispose of used pads/tampons hygienically — wrap and bin, never flush.',
                    'Menstrual cups are reusable and eco-friendly — sterilise before and after each cycle.',
                    'Stay hydrated (2–3 litres/day) to reduce bloating and cramps during menstruation.',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Nutrition Tips */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <h3 className="font-semibold text-green-800 mb-3">🥗 Nutrition for Cycle Health</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    'Iron-rich foods (spinach, lentils, dates) help replenish blood loss during menstruation.',
                    'Magnesium (dark chocolate, pumpkin seeds) reduces PMS cramps and mood swings.',
                    'Vitamin D deficiency is common in PCOS — get sunlight or consider supplementation.',
                    'Spearmint tea (2 cups/day) has shown mild anti-androgen effects in PCOS studies.',
                    'Avoid excess dairy and processed foods during your period — they can worsen inflammation.',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* When to See a Doctor */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="font-semibold text-red-800 mb-3">🏥 When to See a Doctor</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    'Period is more than 7 days late and you are not pregnant.',
                    'Cycles are consistently shorter than 21 days or longer than 35 days.',
                    'Severe pain, heavy bleeding (soaking a pad in under 2 hours), or passing large clots.',
                    'Noticing excess facial/body hair, acne, or unexplained weight gain.',
                    'Trying to conceive for 6+ months without success.',
                    frequentlyLate
                      ? '⚡ Your history shows frequent late periods — a gynaecologist visit is recommended.'
                      : 'Any sudden change in your usual cycle pattern.',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200 rounded-xl p-5 text-center">
              <p className="text-gray-700 font-medium mb-3">Want a deeper assessment? Use the full PCOS symptom checker.</p>
              <button
                onClick={() => setActiveTab('pcos-assessment')}
                className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                Go to PCOS Assessment →
              </button>
            </div>

          </div>
        );
      })()}
    </div>
  );
};

export default PeriodPCOSTracker;
