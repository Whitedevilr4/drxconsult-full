import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const MoodAnalyzer = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    overallMood: 'neutral',
    energyLevel: 'moderate',
    stressLevel: 'moderate',
    anxietyLevel: 'mild',
    sleepQuality: 'fair',
    socialInteraction: 'moderate',
    physicalActivity: 'light',
    symptoms: [],
    triggers: [],
    copingStrategies: [],
    notes: ''
  });

  const symptomOptions = [
    { value: 'headache', label: 'Headache' },
    { value: 'fatigue', label: 'Fatigue' },
    { value: 'irritability', label: 'Irritability' },
    { value: 'difficulty_concentrating', label: 'Difficulty Concentrating' },
    { value: 'appetite_changes', label: 'Appetite Changes' },
    { value: 'mood_swings', label: 'Mood Swings' },
    { value: 'crying_spells', label: 'Crying Spells' },
    { value: 'withdrawal', label: 'Social Withdrawal' },
    { value: 'restlessness', label: 'Restlessness' },
    { value: 'hopelessness', label: 'Hopelessness' },
    { value: 'guilt', label: 'Guilt' },
    { value: 'worthlessness', label: 'Worthlessness' }
  ];

  const triggerOptions = [
    { value: 'work_stress', label: 'Work Stress' },
    { value: 'relationship_issues', label: 'Relationship Issues' },
    { value: 'financial_concerns', label: 'Financial Concerns' },
    { value: 'health_issues', label: 'Health Issues' },
    { value: 'family_problems', label: 'Family Problems' },
    { value: 'social_situations', label: 'Social Situations' },
    { value: 'weather', label: 'Weather' },
    { value: 'hormonal_changes', label: 'Hormonal Changes' },
    { value: 'lack_of_sleep', label: 'Lack of Sleep' },
    { value: 'poor_diet', label: 'Poor Diet' },
    { value: 'alcohol', label: 'Alcohol' },
    { value: 'medication_changes', label: 'Medication Changes' }
  ];

  const copingOptions = [
    { value: 'exercise', label: 'Exercise' },
    { value: 'meditation', label: 'Meditation' },
    { value: 'deep_breathing', label: 'Deep Breathing' },
    { value: 'journaling', label: 'Journaling' },
    { value: 'music', label: 'Music' },
    { value: 'talking_to_friends', label: 'Talking to Friends' },
    { value: 'professional_help', label: 'Professional Help' },
    { value: 'hobbies', label: 'Hobbies' },
    { value: 'nature', label: 'Time in Nature' },
    { value: 'reading', label: 'Reading' },
    { value: 'creative_activities', label: 'Creative Activities' },
    { value: 'relaxation_techniques', label: 'Relaxation Techniques' }
  ];

  useEffect(() => {
    fetchMoodData();
  }, []);

  const fetchMoodData = async () => {
    try {
      const response = await axios.get('/health-trackers/mood-tracker');
      setEntries(response.data.entries || []);
    } catch (error) {
      console.error('Error fetching mood data:', error);
      toast.error('Failed to load mood data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/health-trackers/mood-tracker', formData);
      toast.success('Mood entry added successfully!');
      setShowAddForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        overallMood: 'neutral',
        energyLevel: 'moderate',
        stressLevel: 'moderate',
        anxietyLevel: 'mild',
        sleepQuality: 'fair',
        socialInteraction: 'moderate',
        physicalActivity: 'light',
        symptoms: [],
        triggers: [],
        copingStrategies: [],
        notes: ''
      });
      fetchMoodData();
    } catch (error) {
      console.error('Error adding mood entry:', error);
      toast.error('Failed to add mood entry');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this mood entry?')) {
      try {
        await axios.delete(`/health-trackers/mood-tracker/${id}`);
        toast.success('Mood entry deleted successfully!');
        fetchMoodData();
      } catch (error) {
        console.error('Error deleting mood entry:', error);
        toast.error('Failed to delete mood entry');
      }
    }
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const generateMoodAnalysis = () => {
    if (entries.length === 0) return null;

    const recentEntries = entries.slice(0, 14); // Last 14 days
    
    // Mood scoring
    const moodScores = {
      very_sad: 1, sad: 2, neutral: 3, happy: 4, very_happy: 5
    };
    
    const energyScores = {
      very_low: 1, low: 2, moderate: 3, high: 4, very_high: 5
    };
    
    const stressScores = {
      very_low: 1, low: 2, moderate: 3, high: 4, very_high: 5
    };
    
    const anxietyScores = {
      none: 1, mild: 2, moderate: 3, high: 4, severe: 5
    };

    const avgMood = recentEntries.reduce((sum, entry) => sum + moodScores[entry.overallMood], 0) / recentEntries.length;
    const avgEnergy = recentEntries.reduce((sum, entry) => sum + energyScores[entry.energyLevel], 0) / recentEntries.length;
    const avgStress = recentEntries.reduce((sum, entry) => sum + stressScores[entry.stressLevel], 0) / recentEntries.length;
    const avgAnxiety = recentEntries.reduce((sum, entry) => sum + anxietyScores[entry.anxietyLevel], 0) / recentEntries.length;

    // Risk calculation
    let riskScore = 0;
    
    // Low mood scoring
    if (avgMood < 2.5) riskScore += 4;
    else if (avgMood < 3) riskScore += 2;
    
    // High stress scoring
    if (avgStress > 3.5) riskScore += 3;
    else if (avgStress > 3) riskScore += 1;
    
    // High anxiety scoring
    if (avgAnxiety > 3.5) riskScore += 3;
    else if (avgAnxiety > 3) riskScore += 1;
    
    // Low energy scoring
    if (avgEnergy < 2.5) riskScore += 2;
    else if (avgEnergy < 3) riskScore += 1;

    // Symptom frequency
    const allSymptoms = recentEntries.flatMap(entry => entry.symptoms || []);
    const symptomFreq = allSymptoms.length / recentEntries.length;
    if (symptomFreq > 3) riskScore += 2;
    else if (symptomFreq > 1.5) riskScore += 1;

    let riskLevel = 'Low';
    let riskColor = 'text-green-600';
    let riskBg = 'bg-green-50';

    if (riskScore >= 8) {
      riskLevel = 'High';
      riskColor = 'text-red-600';
      riskBg = 'bg-red-50';
    } else if (riskScore >= 4) {
      riskLevel = 'Moderate';
      riskColor = 'text-orange-600';
      riskBg = 'bg-orange-50';
    }

    const recommendations = [];
    const urgentActions = [];
    const preventiveActions = [];

    if (riskLevel === 'High') {
      urgentActions.push(
        'Consider consulting a mental health professional',
        'Reach out to trusted friends or family for support',
        'Contact a crisis helpline if having thoughts of self-harm',
        'Evaluate need for immediate professional intervention'
      );
      recommendations.push(
        'Establish daily self-care routines',
        'Practice stress management techniques',
        'Maintain regular sleep schedule',
        'Consider therapy or counseling'
      );
    } else if (riskLevel === 'Moderate') {
      recommendations.push(
        'Increase physical activity and exercise',
        'Practice mindfulness or meditation',
        'Maintain social connections',
        'Consider talking to a counselor'
      );
    } else {
      recommendations.push(
        'Continue maintaining good mental health habits',
        'Keep up with regular exercise and social activities',
        'Monitor mood patterns for any changes',
        'Practice gratitude and positive thinking'
      );
    }

    preventiveActions.push(
      'Regular exercise and physical activity',
      'Maintain healthy sleep patterns',
      'Practice stress reduction techniques',
      'Stay connected with supportive relationships'
    );

    // Most common triggers and symptoms
    const triggerCounts = {};
    const symptomCounts = {};
    
    recentEntries.forEach(entry => {
      (entry.triggers || []).forEach(trigger => {
        triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
      });
      (entry.symptoms || []).forEach(symptom => {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
      });
    });

    const topTriggers = Object.entries(triggerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([trigger]) => trigger);

    const topSymptoms = Object.entries(symptomCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([symptom]) => symptom);

    return {
      riskLevel,
      riskColor,
      riskBg,
      riskScore,
      avgMood: Math.round(avgMood * 10) / 10,
      avgEnergy: Math.round(avgEnergy * 10) / 10,
      avgStress: Math.round(avgStress * 10) / 10,
      avgAnxiety: Math.round(avgAnxiety * 10) / 10,
      recommendations,
      urgentActions,
      preventiveActions,
      topTriggers,
      topSymptoms,
      daysAnalyzed: recentEntries.length
    };
  };

  const analysis = generateMoodAnalysis();

  const getMoodColor = (mood) => {
    switch (mood) {
      case 'very_happy': return 'text-green-600 bg-green-100';
      case 'happy': return 'text-blue-600 bg-blue-100';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      case 'sad': return 'text-orange-600 bg-orange-100';
      case 'very_sad': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMoodEmoji = (mood) => {
    switch (mood) {
      case 'very_happy': return '😄';
      case 'happy': return '😊';
      case 'neutral': return '😐';
      case 'sad': return '😔';
      case 'very_sad': return '😢';
      default: return '😐';
    }
  };

  const formatLabel = (value) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Mood Analyzer</h1>
          <p className="text-gray-600">Track your mental health and emotional wellbeing</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Mood Entry
        </button>
      </div>

      {/* Add Mood Entry Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Mood Entry</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overall Mood</label>
                  <select
                    value={formData.overallMood}
                    onChange={(e) => setFormData({ ...formData, overallMood: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="very_sad">Very Sad 😢</option>
                    <option value="sad">Sad 😔</option>
                    <option value="neutral">Neutral 😐</option>
                    <option value="happy">Happy 😊</option>
                    <option value="very_happy">Very Happy 😄</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Energy Level</label>
                  <select
                    value={formData.energyLevel}
                    onChange={(e) => setFormData({ ...formData, energyLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="very_low">Very Low</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="very_high">Very High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stress Level</label>
                  <select
                    value={formData.stressLevel}
                    onChange={(e) => setFormData({ ...formData, stressLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="very_low">Very Low</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="very_high">Very High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Anxiety Level</label>
                  <select
                    value={formData.anxietyLevel}
                    onChange={(e) => setFormData({ ...formData, anxietyLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="none">None</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Quality</label>
                  <select
                    value={formData.sleepQuality}
                    onChange={(e) => setFormData({ ...formData, sleepQuality: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="very_poor">Very Poor</option>
                    <option value="poor">Poor</option>
                    <option value="fair">Fair</option>
                    <option value="good">Good</option>
                    <option value="excellent">Excellent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Social Interaction</label>
                  <select
                    value={formData.socialInteraction}
                    onChange={(e) => setFormData({ ...formData, socialInteraction: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="none">None</option>
                    <option value="minimal">Minimal</option>
                    <option value="moderate">Moderate</option>
                    <option value="active">Active</option>
                    <option value="very_active">Very Active</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Physical Activity</label>
                  <select
                    value={formData.physicalActivity}
                    onChange={(e) => setFormData({ ...formData, physicalActivity: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="none">None</option>
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="intense">Intense</option>
                    <option value="very_intense">Very Intense</option>
                  </select>
                </div>
              </div>

              {/* Symptoms */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms (select all that apply)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {symptomOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.symptoms.includes(option.value)}
                        onChange={() => handleCheckboxChange('symptoms', option.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Triggers */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Triggers (select all that apply)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {triggerOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.triggers.includes(option.value)}
                        onChange={() => handleCheckboxChange('triggers', option.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Coping Strategies */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Coping Strategies Used (select all that apply)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {copingOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.copingStrategies.includes(option.value)}
                        onChange={() => handleCheckboxChange('copingStrategies', option.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  rows="3"
                  maxLength="1000"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Entry
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

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😊</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No mood data yet</h2>
          <p className="text-gray-500 mb-4">Start tracking your mood to get personalized insights</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Your First Mood Entry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Mood Analysis */}
          {analysis && (
            <div className={`${analysis.riskBg} border-l-4 ${analysis.riskLevel === 'High' ? 'border-red-500' : analysis.riskLevel === 'Moderate' ? 'border-orange-500' : 'border-green-500'} rounded-lg p-6`}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    🧠 AI Mental Health Analysis
                  </h3>
                  <div className={`text-2xl font-bold ${analysis.riskColor}`}>
                    {analysis.riskLevel} Risk
                  </div>
                  <div className="text-sm text-gray-600">
                    Based on {analysis.daysAnalyzed} recent mood entries
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl mb-2">
                    {analysis.riskLevel === 'High' ? '😟' : analysis.riskLevel === 'Moderate' ? '😐' : '😊'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Wellbeing Score: {Math.max(0, 10 - analysis.riskScore)}/10
                  </div>
                </div>
              </div>

              {/* Mood Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{analysis.avgMood}/5</div>
                  <div className="text-xs text-gray-600">Avg Mood</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{analysis.avgEnergy}/5</div>
                  <div className="text-xs text-gray-600">Avg Energy</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{analysis.avgStress}/5</div>
                  <div className="text-xs text-gray-600">Avg Stress</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{analysis.avgAnxiety}/5</div>
                  <div className="text-xs text-gray-600">Avg Anxiety</div>
                </div>
              </div>

              {/* Top Triggers and Symptoms */}
              {(analysis.topTriggers.length > 0 || analysis.topSymptoms.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {analysis.topTriggers.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <h4 className="font-semibold text-orange-800 mb-2">🎯 Common Triggers</h4>
                      <div className="space-y-1">
                        {analysis.topTriggers.map((trigger, index) => (
                          <div key={index} className="text-sm text-orange-700">
                            • {formatLabel(trigger)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.topSymptoms.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <h4 className="font-semibold text-red-800 mb-2">⚠️ Common Symptoms</h4>
                      <div className="space-y-1">
                        {analysis.topSymptoms.map((symptom, index) => (
                          <div key={index} className="text-sm text-red-700">
                            • {formatLabel(symptom)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {analysis.urgentActions.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-3">🚨 Urgent Actions</h4>
                    <ul className="space-y-2">
                      {analysis.urgentActions.map((action, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-red-600 mt-1">•</span>
                          <span className="text-gray-700 text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-3">💡 Recommendations</h4>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-orange-600 mt-1">•</span>
                        <span className="text-gray-700 text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-3">🌱 Preventive Care</h4>
                  <ul className="space-y-2">
                    {analysis.preventiveActions.map((action, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-green-600 mt-1">•</span>
                        <span className="text-gray-700 text-sm">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Mental Health Resources */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3">📞 Mental Health Resources</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-800">Crisis Support:</div>
                    <div className="text-blue-700">National Suicide Prevention Lifeline: 988</div>
                    <div className="text-blue-700">Crisis Text Line: Text HOME to 741741</div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-800">Professional Help:</div>
                    <div className="text-blue-700">Psychology Today: Find a therapist</div>
                    <div className="text-blue-700">SAMHSA: 1-800-662-4357</div>
                  </div>
                </div>
              </div>

              {/* Medical Disclaimer */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 text-xl">⚠️</span>
                  <div>
                    <h4 className="font-medium text-yellow-800">Medical Disclaimer</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      This mood analysis is for informational purposes only and not a substitute for professional mental health care. 
                      If you're experiencing persistent mental health concerns, please consult with a qualified mental health professional.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mood Entries */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Mood History</h2>
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="font-medium">
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(entry.overallMood)}`}>
                          {getMoodEmoji(entry.overallMood)} {formatLabel(entry.overallMood)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">Energy:</span> {formatLabel(entry.energyLevel)}
                        </div>
                        <div>
                          <span className="font-medium">Stress:</span> {formatLabel(entry.stressLevel)}
                        </div>
                        <div>
                          <span className="font-medium">Anxiety:</span> {formatLabel(entry.anxietyLevel)}
                        </div>
                        <div>
                          <span className="font-medium">Sleep:</span> {formatLabel(entry.sleepQuality)}
                        </div>
                      </div>
                      {entry.symptoms && entry.symptoms.length > 0 && (
                        <div className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Symptoms:</span> {entry.symptoms.map(formatLabel).join(', ')}
                        </div>
                      )}
                      {entry.triggers && entry.triggers.length > 0 && (
                        <div className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Triggers:</span> {entry.triggers.map(formatLabel).join(', ')}
                        </div>
                      )}
                      {entry.notes && (
                        <div className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Notes:</span> {entry.notes}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(entry._id)}
                      className="text-red-600 hover:text-red-800 ml-4"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodAnalyzer;