import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const SleepAnalyzer = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bedTime: '',
    sleepTime: '',
    wakeTime: '',
    sleepQuality: 'good',
    timeToFallAsleep: '',
    nightWakeups: 0,
    caffeineIntake: 'none',
    screenTimeBeforeBed: 0,
    exerciseToday: false,
    stressLevel: 'low',
    notes: ''
  });

  useEffect(() => {
    fetchSleepData();
  }, []);

  const fetchSleepData = async () => {
    try {
      const response = await axios.get('/health-trackers/sleep-tracker');
      setEntries(response.data.entries || []);
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      toast.error('Failed to load sleep data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/health-trackers/sleep-tracker', formData);
      toast.success('Sleep entry added successfully!');
      setShowAddForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        bedTime: '',
        sleepTime: '',
        wakeTime: '',
        sleepQuality: 'good',
        timeToFallAsleep: '',
        nightWakeups: 0,
        caffeineIntake: 'none',
        screenTimeBeforeBed: 0,
        exerciseToday: false,
        stressLevel: 'low',
        notes: ''
      });
      fetchSleepData();
    } catch (error) {
      console.error('Error adding sleep entry:', error);
      toast.error('Failed to add sleep entry');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this sleep entry?')) {
      try {
        await axios.delete(`/health-trackers/sleep-tracker/${id}`);
        toast.success('Sleep entry deleted successfully!');
        fetchSleepData();
      } catch (error) {
        console.error('Error deleting sleep entry:', error);
        toast.error('Failed to delete sleep entry');
      }
    }
  };

  const generateSleepAnalysis = () => {
    if (entries.length === 0) return null;

    const recentEntries = entries.slice(0, 7); // Last 7 days
    const avgSleepDuration = recentEntries.reduce((sum, entry) => sum + entry.sleepDuration, 0) / recentEntries.length;
    const avgTimeToSleep = recentEntries.reduce((sum, entry) => sum + entry.timeToFallAsleep, 0) / recentEntries.length;
    const avgWakeups = recentEntries.reduce((sum, entry) => sum + entry.nightWakeups, 0) / recentEntries.length;
    
    const qualityDistribution = recentEntries.reduce((acc, entry) => {
      acc[entry.sleepQuality] = (acc[entry.sleepQuality] || 0) + 1;
      return acc;
    }, {});

    const poorSleepDays = (qualityDistribution.poor || 0) + (qualityDistribution.fair || 0);
    const goodSleepDays = (qualityDistribution.good || 0) + (qualityDistribution.excellent || 0);

    let riskLevel = 'Low';
    let riskColor = 'text-green-600';
    let riskBg = 'bg-green-50';
    let score = 0;

    // Sleep duration scoring
    if (avgSleepDuration < 6) score += 3;
    else if (avgSleepDuration < 7) score += 2;
    else if (avgSleepDuration > 9) score += 1;

    // Time to fall asleep scoring
    if (avgTimeToSleep > 30) score += 2;
    else if (avgTimeToSleep > 15) score += 1;

    // Night wakeups scoring
    if (avgWakeups > 2) score += 2;
    else if (avgWakeups > 1) score += 1;

    // Sleep quality scoring
    if (poorSleepDays > goodSleepDays) score += 3;
    else if (poorSleepDays === goodSleepDays) score += 1;

    // Determine risk level
    if (score >= 6) {
      riskLevel = 'High';
      riskColor = 'text-red-600';
      riskBg = 'bg-red-50';
    } else if (score >= 3) {
      riskLevel = 'Moderate';
      riskColor = 'text-orange-600';
      riskBg = 'bg-orange-50';
    }

    const recommendations = [];
    const urgentActions = [];
    const preventiveActions = [];

    if (riskLevel === 'High') {
      urgentActions.push(
        'Consider consulting a sleep specialist',
        'Evaluate for sleep disorders (sleep apnea, insomnia)',
        'Review medications that might affect sleep',
        'Address underlying health conditions'
      );
      recommendations.push(
        'Establish a consistent sleep schedule',
        'Create a relaxing bedtime routine',
        'Limit caffeine and screen time before bed',
        'Optimize sleep environment (temperature, darkness, quiet)'
      );
    } else if (riskLevel === 'Moderate') {
      recommendations.push(
        'Improve sleep hygiene practices',
        'Maintain consistent sleep-wake times',
        'Reduce caffeine intake, especially after 2 PM',
        'Create a wind-down routine before bed'
      );
    } else {
      recommendations.push(
        'Continue maintaining good sleep habits',
        'Keep consistent sleep schedule',
        'Monitor for any changes in sleep patterns',
        'Stay physically active during the day'
      );
    }

    preventiveActions.push(
      'Regular exercise (but not close to bedtime)',
      'Manage stress through relaxation techniques',
      'Maintain a comfortable sleep environment',
      'Avoid large meals and alcohol before bedtime'
    );

    return {
      riskLevel,
      riskColor,
      riskBg,
      score,
      avgSleepDuration: Math.round(avgSleepDuration * 10) / 10,
      avgTimeToSleep: Math.round(avgTimeToSleep),
      avgWakeups: Math.round(avgWakeups * 10) / 10,
      qualityDistribution,
      recommendations,
      urgentActions,
      preventiveActions,
      daysAnalyzed: recentEntries.length
    };
  };

  const analysis = generateSleepAnalysis();

  const getSleepQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-orange-600 bg-orange-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sleep Analyzer</h1>
          <p className="text-gray-600">Track your sleep patterns and improve your sleep quality</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Sleep Entry
        </button>
      </div>

      {/* Add Sleep Entry Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Sleep Entry</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Quality</label>
                  <select
                    value={formData.sleepQuality}
                    onChange={(e) => setFormData({ ...formData, sleepQuality: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="poor">Poor</option>
                    <option value="fair">Fair</option>
                    <option value="good">Good</option>
                    <option value="excellent">Excellent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bed Time</label>
                  <input
                    type="time"
                    value={formData.bedTime}
                    onChange={(e) => setFormData({ ...formData, bedTime: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Time</label>
                  <input
                    type="time"
                    value={formData.sleepTime}
                    onChange={(e) => setFormData({ ...formData, sleepTime: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wake Time</label>
                  <input
                    type="time"
                    value={formData.wakeTime}
                    onChange={(e) => setFormData({ ...formData, wakeTime: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time to Fall Asleep (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={formData.timeToFallAsleep}
                    onChange={(e) => setFormData({ ...formData, timeToFallAsleep: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Night Wakeups</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.nightWakeups}
                    onChange={(e) => setFormData({ ...formData, nightWakeups: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caffeine Intake</label>
                  <select
                    value={formData.caffeineIntake}
                    onChange={(e) => setFormData({ ...formData, caffeineIntake: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="none">None</option>
                    <option value="low">Low (1 cup)</option>
                    <option value="moderate">Moderate (2-3 cups)</option>
                    <option value="high">High (4+ cups)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Screen Time Before Bed (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="480"
                    value={formData.screenTimeBeforeBed}
                    onChange={(e) => setFormData({ ...formData, screenTimeBeforeBed: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stress Level</label>
                  <select
                    value={formData.stressLevel}
                    onChange={(e) => setFormData({ ...formData, stressLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="exerciseToday"
                    checked={formData.exerciseToday}
                    onChange={(e) => setFormData({ ...formData, exerciseToday: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="exerciseToday" className="text-sm font-medium text-gray-700">
                    Exercised Today
                  </label>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  maxLength="500"
                />
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
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
          <div className="text-6xl mb-4">😴</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No sleep data yet</h2>
          <p className="text-gray-500 mb-4">Start tracking your sleep to get personalized insights</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Your First Sleep Entry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Sleep Analysis */}
          {analysis && (
            <div className={`${analysis.riskBg} border-l-4 ${analysis.riskLevel === 'High' ? 'border-red-500' : analysis.riskLevel === 'Moderate' ? 'border-orange-500' : 'border-green-500'} rounded-lg p-6`}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    🧠 AI Sleep Quality Analysis
                  </h3>
                  <div className={`text-2xl font-bold ${analysis.riskColor}`}>
                    {analysis.riskLevel} Risk
                  </div>
                  <div className="text-sm text-gray-600">
                    Based on {analysis.daysAnalyzed} recent sleep entries
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl mb-2">
                    {analysis.riskLevel === 'High' ? '😴' : analysis.riskLevel === 'Moderate' ? '😊' : '✨'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Sleep Score: {10 - analysis.score}/10
                  </div>
                </div>
              </div>

              {/* Sleep Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{analysis.avgSleepDuration}h</div>
                  <div className="text-xs text-gray-600">Avg Sleep</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{analysis.avgTimeToSleep}m</div>
                  <div className="text-xs text-gray-600">Time to Sleep</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{analysis.avgWakeups}</div>
                  <div className="text-xs text-gray-600">Night Wakeups</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {Math.round(((analysis.qualityDistribution.good || 0) + (analysis.qualityDistribution.excellent || 0)) / analysis.daysAnalyzed * 100)}%
                  </div>
                  <div className="text-xs text-gray-600">Good Sleep Days</div>
                </div>
              </div>

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

              {/* Medical Disclaimer */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 text-xl">⚠️</span>
                  <div>
                    <h4 className="font-medium text-yellow-800">Medical Disclaimer</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      This sleep analysis is for informational purposes only and not a substitute for professional medical advice. 
                      If you have persistent sleep problems, consult with a healthcare provider or sleep specialist.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sleep Entries */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Sleep History</h2>
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="font-medium">
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSleepQualityColor(entry.sleepQuality)}`}>
                          {entry.sleepQuality.charAt(0).toUpperCase() + entry.sleepQuality.slice(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Sleep:</span> {entry.sleepDuration}h
                        </div>
                        <div>
                          <span className="font-medium">Bed:</span> {formatTime(entry.bedTime)}
                        </div>
                        <div>
                          <span className="font-medium">Wake:</span> {formatTime(entry.wakeTime)}
                        </div>
                        <div>
                          <span className="font-medium">Time to Sleep:</span> {entry.timeToFallAsleep}m
                        </div>
                      </div>
                      {entry.notes && (
                        <div className="mt-2 text-sm text-gray-600">
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

export default SleepAnalyzer;