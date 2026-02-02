import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const ExerciseTracker = () => {
  const [tracker, setTracker] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [profileData, setProfileData] = useState({
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    fitnessLevel: 'intermediate',
    dailyStepGoal: 10000,
    dailyCalorieGoal: 300
  });

  const [exerciseData, setExerciseData] = useState({
    date: new Date().toISOString().split('T')[0],
    exerciseType: 'walking',
    duration: '',
    intensity: 'moderate',
    steps: '',
    notes: ''
  });

  const exerciseTypes = [
    { value: 'walking', label: 'Walking', icon: '🚶', caloriesPerMin: { low: 3, moderate: 4, high: 5, very_high: 6 } },
    { value: 'running', label: 'Running', icon: '🏃', caloriesPerMin: { low: 8, moderate: 10, high: 12, very_high: 15 } },
    { value: 'cycling', label: 'Cycling', icon: '🚴', caloriesPerMin: { low: 5, moderate: 7, high: 9, very_high: 12 } },
    { value: 'swimming', label: 'Swimming', icon: '🏊', caloriesPerMin: { low: 6, moderate: 8, high: 11, very_high: 14 } },
    { value: 'yoga', label: 'Yoga', icon: '🧘', caloriesPerMin: { low: 2, moderate: 3, high: 4, very_high: 5 } },
    { value: 'gym_workout', label: 'Gym Workout', icon: '🏋️', caloriesPerMin: { low: 4, moderate: 6, high: 8, very_high: 10 } },
    { value: 'dancing', label: 'Dancing', icon: '💃', caloriesPerMin: { low: 3, moderate: 5, high: 7, very_high: 9 } },
    { value: 'sports', label: 'Sports', icon: '⚽', caloriesPerMin: { low: 5, moderate: 7, high: 9, very_high: 12 } },
    { value: 'stairs', label: 'Climbing Stairs', icon: '🪜', caloriesPerMin: { low: 6, moderate: 8, high: 10, very_high: 12 } },
    { value: 'household_chores', label: 'Household Chores', icon: '🧹', caloriesPerMin: { low: 2, moderate: 3, high: 4, very_high: 5 } },
    { value: 'other', label: 'Other', icon: '🏃‍♂️', caloriesPerMin: { low: 3, moderate: 4, high: 6, very_high: 8 } }
  ];

  const intensityLevels = [
    { value: 'low', label: 'Low Intensity', description: 'Light effort, can sing' },
    { value: 'moderate', label: 'Moderate Intensity', description: 'Some effort, can talk' },
    { value: 'high', label: 'High Intensity', description: 'Hard effort, difficult to talk' },
    { value: 'very_high', label: 'Very High Intensity', description: 'Maximum effort, cannot talk' }
  ];

  const fitnessLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  useEffect(() => {
    fetchExerciseTracker();
  }, []);

  useEffect(() => {
    if (selectedDate && tracker) {
      fetchDailySummary(selectedDate);
    }
  }, [selectedDate, tracker]);

  const fetchExerciseTracker = async () => {
    try {
      const response = await axios.get('/health-trackers/exercise-tracker');
      setTracker(response.data);
      if (!response.data.userProfile) {
        setShowProfileForm(true);
      }
    } catch (error) {
      console.error('Error fetching exercise tracker:', error);
      toast.error('Failed to load exercise tracker data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async (date) => {
    try {
      const response = await axios.get(`/health-trackers/exercise-tracker/summary?date=${date}`);
      setDailySummary(response.data);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    }
  };

  const calculateCalories = (exerciseType, duration, intensity, weight = 70) => {
    const exercise = exerciseTypes.find(e => e.value === exerciseType);
    if (!exercise) return 0;
    
    const baseCalories = exercise.caloriesPerMin[intensity] || 4;
    const weightFactor = weight / 70; // Adjust for user weight
    return Math.round(baseCalories * duration * weightFactor);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/health-trackers/exercise-tracker/profile', profileData);
      setTracker(response.data);
      setShowProfileForm(false);
      toast.success('Profile created successfully!');
      fetchDailySummary(selectedDate);
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  };

  const handleExerciseSubmit = async (e) => {
    e.preventDefault();
    try {
      const weight = tracker?.userProfile?.weight || 70;
      const caloriesBurned = calculateCalories(
        exerciseData.exerciseType, 
        parseInt(exerciseData.duration), 
        exerciseData.intensity, 
        weight
      );

      const exercisePayload = {
        ...exerciseData,
        duration: parseInt(exerciseData.duration),
        steps: parseInt(exerciseData.steps) || 0,
        caloriesBurned
      };
      
      await axios.post('/health-trackers/exercise-tracker/exercise', exercisePayload);
      toast.success('Exercise added successfully!');
      setShowExerciseForm(false);
      setExerciseData({
        date: new Date().toISOString().split('T')[0],
        exerciseType: 'walking',
        duration: '',
        intensity: 'moderate',
        steps: '',
        notes: ''
      });
      fetchExerciseTracker();
      fetchDailySummary(exerciseData.date);
    } catch (error) {
      console.error('Error adding exercise:', error);
      toast.error('Failed to add exercise');
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressBg = (percentage) => {
    if (percentage >= 100) return 'bg-green-50';
    if (percentage >= 80) return 'bg-blue-50';
    if (percentage >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getHealthBenefits = (exerciseType) => {
    const benefits = {
      walking: ['Improves cardiovascular health', 'Strengthens bones', 'Boosts mood', 'Aids weight management'],
      running: ['Excellent cardio workout', 'Burns high calories', 'Strengthens legs', 'Improves endurance'],
      cycling: ['Low-impact cardio', 'Strengthens leg muscles', 'Improves joint mobility', 'Eco-friendly transport'],
      swimming: ['Full-body workout', 'Low-impact exercise', 'Improves lung capacity', 'Great for joints'],
      yoga: ['Improves flexibility', 'Reduces stress', 'Enhances balance', 'Promotes mindfulness'],
      gym_workout: ['Builds muscle strength', 'Improves bone density', 'Boosts metabolism', 'Enhances physique'],
      dancing: ['Fun cardio workout', 'Improves coordination', 'Boosts mood', 'Social activity'],
      sports: ['Improves agility', 'Team building', 'Competitive spirit', 'Full-body workout'],
      stairs: ['Strengthens legs', 'High calorie burn', 'Improves stamina', 'Convenient exercise'],
      household_chores: ['Functional fitness', 'Burns calories', 'Productive activity', 'Improves daily strength'],
      other: ['Varies by activity', 'Keeps body active', 'Prevents sedentary lifestyle', 'General fitness']
    };
    return benefits[exerciseType] || benefits.other;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tracker?.userProfile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏃‍♂️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Set Up Your Exercise Profile</h2>
          <p className="text-gray-500 mb-4">Create your profile to start tracking exercises and calories</p>
          <button
            onClick={() => setShowProfileForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create Profile
          </button>
        </div>

        {/* Profile Setup Modal */}
        {showProfileForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Create Your Exercise Profile</h2>
              <form onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                    <input
                      type="number"
                      min="13"
                      max="120"
                      value={profileData.age}
                      onChange={(e) => setProfileData({ ...profileData, age: parseInt(e.target.value) || '' })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={profileData.gender}
                      onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      value={profileData.weight}
                      onChange={(e) => setProfileData({ ...profileData, weight: parseFloat(e.target.value) || '' })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                    <input
                      type="number"
                      min="100"
                      max="250"
                      value={profileData.height}
                      onChange={(e) => setProfileData({ ...profileData, height: parseFloat(e.target.value) || '' })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fitness Level</label>
                  <select
                    value={profileData.fitnessLevel}
                    onChange={(e) => setProfileData({ ...profileData, fitnessLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {fitnessLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily Step Goal</label>
                    <input
                      type="number"
                      min="1000"
                      max="50000"
                      value={profileData.dailyStepGoal}
                      onChange={(e) => setProfileData({ ...profileData, dailyStepGoal: parseInt(e.target.value) || 10000 })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily Calorie Burn Goal</label>
                    <input
                      type="number"
                      min="100"
                      max="2000"
                      value={profileData.dailyCalorieGoal}
                      onChange={(e) => setProfileData({ ...profileData, dailyCalorieGoal: parseInt(e.target.value) || 300 })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Create Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfileForm(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Exercise Tracker</h1>
          <p className="text-gray-600">Track your daily exercises, steps, and calorie burn</p>
        </div>
        <div className="flex space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => setShowExerciseForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Exercise
          </button>
        </div>
      </div>

      {/* Daily Summary */}
      {dailySummary && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Daily Summary - {new Date(selectedDate).toLocaleDateString()}</h2>
          
          {/* Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`${getProgressBg(dailySummary.achievement.steps)} border rounded-lg p-4`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Steps</span>
                <span className="text-sm text-gray-600">{dailySummary.achievement.steps}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`${getProgressColor(dailySummary.achievement.steps)} h-2 rounded-full`}
                  style={{ width: `${Math.min(dailySummary.achievement.steps, 100)}%` }}
                ></div>
              </div>
              <div className="text-lg font-bold">{dailySummary.summary.totalSteps.toLocaleString()} / {dailySummary.goals.steps.toLocaleString()}</div>
            </div>

            <div className={`${getProgressBg(dailySummary.achievement.calories)} border rounded-lg p-4`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Calories Burned</span>
                <span className="text-sm text-gray-600">{dailySummary.achievement.calories}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`${getProgressColor(dailySummary.achievement.calories)} h-2 rounded-full`}
                  style={{ width: `${Math.min(dailySummary.achievement.calories, 100)}%` }}
                ></div>
              </div>
              <div className="text-lg font-bold">{dailySummary.summary.totalCalories} / {dailySummary.goals.calories}</div>
            </div>

            <div className="bg-purple-50 border rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Exercise Time</div>
              <div className="text-lg font-bold">{dailySummary.summary.totalDuration} minutes</div>
              <div className="text-sm text-gray-600">{dailySummary.summary.exerciseCount} activities</div>
            </div>
          </div>

          {/* Exercise Types Breakdown */}
          {Object.keys(dailySummary.summary.exerciseTypes).length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Exercise Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(dailySummary.summary.exerciseTypes).map(([type, duration]) => {
                  const exercise = exerciseTypes.find(e => e.value === type);
                  const benefits = getHealthBenefits(type);
                  return (
                    <div key={type} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{exercise?.icon || '🏃‍♂️'}</span>
                        <div>
                          <div className="font-medium">{exercise?.label || type}</div>
                          <div className="text-sm text-gray-600">{duration} minutes</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div className="font-medium mb-1">Health Benefits:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {benefits.slice(0, 2).map((benefit, index) => (
                            <li key={index}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Insights and Recommendations */}
          {(dailySummary.insights.insights.length > 0 || dailySummary.insights.recommendations.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {dailySummary.insights.insights.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">✅ Great Job!</h4>
                  <div className="space-y-1">
                    {dailySummary.insights.insights.map((insight, index) => (
                      <div key={index} className="text-sm text-green-700">• {insight}</div>
                    ))}
                  </div>
                </div>
              )}

              {dailySummary.insights.recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Recommendations</h4>
                  <div className="space-y-1">
                    {dailySummary.insights.recommendations.map((rec, index) => (
                      <div key={index} className="text-sm text-blue-700">• {rec}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Exercise Modal */}
      {showExerciseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Exercise</h2>
            <form onSubmit={handleExerciseSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={exerciseData.date}
                    onChange={(e) => setExerciseData({ ...exerciseData, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exercise Type</label>
                  <select
                    value={exerciseData.exerciseType}
                    onChange={(e) => setExerciseData({ ...exerciseData, exerciseType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {exerciseTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={exerciseData.duration}
                    onChange={(e) => setExerciseData({ ...exerciseData, duration: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Steps (optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="50000"
                    value={exerciseData.steps}
                    onChange={(e) => setExerciseData({ ...exerciseData, steps: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Intensity Level</label>
                <div className="space-y-2">
                  {intensityLevels.map(level => (
                    <label key={level.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="intensity"
                        value={level.value}
                        checked={exerciseData.intensity === level.value}
                        onChange={(e) => setExerciseData({ ...exerciseData, intensity: e.target.value })}
                        className="text-blue-600"
                      />
                      <div>
                        <span className="font-medium">{level.label}</span>
                        <span className="text-sm text-gray-500 ml-2">{level.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Calorie Estimate */}
              {exerciseData.duration && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">
                    Estimated Calories: {calculateCalories(
                      exerciseData.exerciseType, 
                      parseInt(exerciseData.duration) || 0, 
                      exerciseData.intensity, 
                      tracker?.userProfile?.weight || 70
                    )} calories
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={exerciseData.notes}
                  onChange={(e) => setExerciseData({ ...exerciseData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  maxLength="500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Exercise
                </button>
                <button
                  type="button"
                  onClick={() => setShowExerciseForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medical Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <div>
            <h4 className="font-medium text-yellow-800">Exercise Disclaimer</h4>
            <p className="text-yellow-700 text-sm mt-1">
              This exercise tracker provides general fitness information and should not replace professional medical advice. 
              Consult with a healthcare provider before starting any new exercise program, especially if you have health conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseTracker;