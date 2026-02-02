import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const FoodAnalyzer = () => {
  const [tracker, setTracker] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [availableFoods, setAvailableFoods] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [profileData, setProfileData] = useState({
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    activityLevel: 'moderately_active',
    dietaryGoal: 'maintain_weight',
    dietaryRestrictions: []
  });

  const [mealData, setMealData] = useState({
    date: new Date().toISOString().split('T')[0],
    mealType: 'breakfast',
    foods: [],
    notes: ''
  });

  const [selectedFoods, setSelectedFoods] = useState([]);

  const activityLevels = [
    { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
    { value: 'lightly_active', label: 'Lightly Active (light exercise 1-3 days/week)' },
    { value: 'moderately_active', label: 'Moderately Active (moderate exercise 3-5 days/week)' },
    { value: 'very_active', label: 'Very Active (hard exercise 6-7 days/week)' },
    { value: 'extremely_active', label: 'Extremely Active (very hard exercise, physical job)' }
  ];

  const dietaryGoals = [
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'weight_gain', label: 'Weight Gain' },
    { value: 'maintain_weight', label: 'Maintain Weight' },
    { value: 'muscle_gain', label: 'Muscle Gain' },
    { value: 'general_health', label: 'General Health' }
  ];

  const dietaryRestrictions = [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'jain', label: 'Jain (No Root Vegetables)' },
    { value: 'gluten_free', label: 'Gluten Free' },
    { value: 'dairy_free', label: 'Dairy Free' },
    { value: 'nut_free', label: 'Nut Free' },
    { value: 'low_sodium', label: 'Low Sodium' },
    { value: 'diabetic', label: 'Diabetic' },
    { value: 'low_spice', label: 'Low Spice' },
    { value: 'no_onion_garlic', label: 'No Onion/Garlic' }
  ];

  useEffect(() => {
    fetchFoodTracker();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDailyAnalysis(selectedDate);
    }
  }, [selectedDate]);

  const fetchFoodTracker = async () => {
    try {
      const [trackerResponse, trendsResponse] = await Promise.allSettled([
        axios.get('/health-trackers/food-tracker'),
        axios.get('/health-trackers/food-tracker/trends')
      ]);
      
      if (trackerResponse.status === 'fulfilled') {
        setTracker(trackerResponse.value.data);
        if (!trackerResponse.value.data.userProfile) {
          setShowProfileForm(true);
        }
      }
      
      if (trendsResponse.status === 'fulfilled') {
        setTrends(trendsResponse.value.data);
      }
    } catch (error) {
      console.error('Error fetching food tracker:', error);
      toast.error('Failed to load food tracker data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyAnalysis = async (date) => {
    try {
      const response = await axios.get(`/health-trackers/food-tracker/analysis?date=${date}`);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error fetching daily analysis:', error);
    }
  };

  const fetchFoods = async (mealType) => {
    try {
      const response = await axios.get(`/health-trackers/food-tracker/foods?mealType=${mealType}`);
      setAvailableFoods(response.data.foods);
    } catch (error) {
      console.error('Error fetching foods:', error);
      toast.error('Failed to load food options');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/health-trackers/food-tracker/profile', profileData);
      setTracker(response.data);
      setShowProfileForm(false);
      toast.success('Profile created successfully!');
      fetchDailyAnalysis(selectedDate);
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  };

  const handleMealSubmit = async (e) => {
    e.preventDefault();
    if (selectedFoods.length === 0) {
      toast.error('Please select at least one food item');
      return;
    }

    try {
      const mealPayload = {
        ...mealData,
        foods: selectedFoods
      };
      
      const response = await axios.post('/health-trackers/food-tracker/meal', mealPayload);
      toast.success('Meal added successfully!');
      setShowMealForm(false);
      setSelectedFoods([]);
      setMealData({
        date: new Date().toISOString().split('T')[0],
        mealType: 'breakfast',
        foods: [],
        notes: ''
      });
      fetchFoodTracker();
      fetchDailyAnalysis(mealData.date);
    } catch (error) {
      console.error('Error adding meal:', error);
      toast.error('Failed to add meal');
    }
  };

  const handleAddMeal = (mealType) => {
    setSelectedMealType(mealType);
    setMealData({ ...mealData, mealType });
    fetchFoods(mealType);
    setShowMealForm(true);
  };

  const handleFoodSelect = (food) => {
    const existingFood = selectedFoods.find(f => f.name === food.name);
    if (existingFood) {
      setSelectedFoods(selectedFoods.map(f => 
        f.name === food.name 
          ? { ...f, quantity: f.quantity + 1 }
          : f
      ));
    } else {
      setSelectedFoods([...selectedFoods, { ...food, quantity: 1 }]);
    }
  };

  const handleFoodQuantityChange = (foodName, quantity) => {
    if (quantity <= 0) {
      setSelectedFoods(selectedFoods.filter(f => f.name !== foodName));
    } else {
      setSelectedFoods(selectedFoods.map(f => 
        f.name === foodName 
          ? { ...f, quantity: parseInt(quantity) || 1 }
          : f
      ));
    }
  };

  const handleRestrictionChange = (restriction) => {
    setProfileData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  const formatLabel = (value) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getProgressColor = (percentage) => {
    if (percentage > 120) return 'bg-red-500';
    if (percentage > 100) return 'bg-orange-500';
    if (percentage > 80) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getProgressBg = (percentage) => {
    if (percentage > 120) return 'bg-red-50';
    if (percentage > 100) return 'bg-orange-50';
    if (percentage > 80) return 'bg-green-50';
    return 'bg-blue-50';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!tracker?.userProfile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Set Up Your Nutrition Profile</h2>
          <p className="text-gray-500 mb-4">Create your profile to get personalized nutrition analysis</p>
          <button
            onClick={() => setShowProfileForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create Profile
          </button>
        </div>

        {/* Profile Setup Modal */}
        {showProfileForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Create Your Nutrition Profile</h2>
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
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={profileData.gender}
                      onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
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
                      value={profileData.weight}
                      onChange={(e) => setProfileData({ ...profileData, weight: parseFloat(e.target.value) || '' })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
                  <select
                    value={profileData.activityLevel}
                    onChange={(e) => setProfileData({ ...profileData, activityLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {activityLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Goal</label>
                  <select
                    value={profileData.dietaryGoal}
                    onChange={(e) => setProfileData({ ...profileData, dietaryGoal: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {dietaryGoals.map(goal => (
                      <option key={goal.value} value={goal.value}>{goal.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Restrictions (optional)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {dietaryRestrictions.map(restriction => (
                      <label key={restriction.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={profileData.dietaryRestrictions.includes(restriction.value)}
                          onChange={() => handleRestrictionChange(restriction.value)}
                          className="rounded"
                        />
                        <span className="text-sm">{restriction.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
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
          <h1 className="text-3xl font-bold text-gray-800">Indian Food Analyzer</h1>
          <p className="text-gray-600">Track your Indian diet and get personalized nutrition insights</p>
        </div>
        <div className="flex space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            onClick={() => setShowProfileForm(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Update Profile
          </button>
        </div>
      </div>

      {/* Daily Analysis */}
      {analysis && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Daily Nutrition Analysis - {new Date(selectedDate).toLocaleDateString()}</h2>
          
          {/* Nutrition Progress */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`${getProgressBg(analysis.percentages.calories)} border rounded-lg p-4`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Calories</span>
                <span className="text-sm text-gray-600">{analysis.percentages.calories}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`${getProgressColor(analysis.percentages.calories)} h-2 rounded-full`}
                  style={{ width: `${Math.min(analysis.percentages.calories, 100)}%` }}
                ></div>
              </div>
              <div className="text-lg font-bold">{analysis.totals.calories} / {analysis.goals.calories}</div>
            </div>

            <div className={`${getProgressBg(analysis.percentages.carbs)} border rounded-lg p-4`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Carbs</span>
                <span className="text-sm text-gray-600">{analysis.percentages.carbs}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`${getProgressColor(analysis.percentages.carbs)} h-2 rounded-full`}
                  style={{ width: `${Math.min(analysis.percentages.carbs, 100)}%` }}
                ></div>
              </div>
              <div className="text-lg font-bold">{analysis.totals.carbs}g / {analysis.goals.carbs}g</div>
            </div>

            <div className={`${getProgressBg(analysis.percentages.protein)} border rounded-lg p-4`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Protein</span>
                <span className="text-sm text-gray-600">{analysis.percentages.protein}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`${getProgressColor(analysis.percentages.protein)} h-2 rounded-full`}
                  style={{ width: `${Math.min(analysis.percentages.protein, 100)}%` }}
                ></div>
              </div>
              <div className="text-lg font-bold">{analysis.totals.protein}g / {analysis.goals.protein}g</div>
            </div>

            <div className={`${getProgressBg(analysis.percentages.fat)} border rounded-lg p-4`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Fat</span>
                <span className="text-sm text-gray-600">{analysis.percentages.fat}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`${getProgressColor(analysis.percentages.fat)} h-2 rounded-full`}
                  style={{ width: `${Math.min(analysis.percentages.fat, 100)}%` }}
                ></div>
              </div>
              <div className="text-lg font-bold">{analysis.totals.fat}g / {analysis.goals.fat}g</div>
            </div>
          </div>

          {/* Additional Nutrients */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round(analysis.totals.fiber)}g</div>
              <div className="text-sm text-gray-600">Fiber</div>
            </div>
            <div className="bg-gray-50 border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{Math.round(analysis.totals.sugar)}g</div>
              <div className="text-sm text-gray-600">Sugar</div>
            </div>
            <div className="bg-gray-50 border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{Math.round(analysis.totals.sodium)}mg</div>
              <div className="text-sm text-gray-600">Sodium</div>
            </div>
            <div className="bg-gray-50 border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(analysis.totals.cholesterol)}mg</div>
              <div className="text-sm text-gray-600">Cholesterol</div>
            </div>
          </div>

          {/* Warnings and Recommendations */}
          {(analysis.warnings.length > 0 || analysis.insights.length > 0 || analysis.recommendations.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {analysis.warnings.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Warnings:</h4>
                  <div className="space-y-1">
                    {analysis.warnings.map((warning, index) => (
                      <div key={index} className="text-sm text-red-700">• {warning}</div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.insights.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">✅ Good Habits:</h4>
                  <div className="space-y-1">
                    {analysis.insights.map((insight, index) => (
                      <div key={index} className="text-sm text-green-700">• {insight}</div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Recommendations:</h4>
                  <div className="space-y-1">
                    {analysis.recommendations.map((rec, index) => (
                      <div key={index} className="text-sm text-blue-700">• {rec}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meal Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => handleAddMeal('breakfast')}
          className="bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded-lg p-4 text-center transition-colors"
        >
          <div className="text-3xl mb-2">🌅</div>
          <div className="font-medium text-yellow-800">Add Breakfast</div>
        </button>
        <button
          onClick={() => handleAddMeal('lunch')}
          className="bg-orange-100 hover:bg-orange-200 border border-orange-300 rounded-lg p-4 text-center transition-colors"
        >
          <div className="text-3xl mb-2">☀️</div>
          <div className="font-medium text-orange-800">Add Lunch</div>
        </button>
        <button
          onClick={() => handleAddMeal('dinner')}
          className="bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg p-4 text-center transition-colors"
        >
          <div className="text-3xl mb-2">🌙</div>
          <div className="font-medium text-blue-800">Add Dinner</div>
        </button>
        <button
          onClick={() => handleAddMeal('snack')}
          className="bg-green-100 hover:bg-green-200 border border-green-300 rounded-lg p-4 text-center transition-colors"
        >
          <div className="text-3xl mb-2">🍎</div>
          <div className="font-medium text-green-800">Add Snack</div>
        </button>
      </div>

      {/* Add Meal Modal */}
      {showMealForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add {formatLabel(selectedMealType)}</h2>
            <form onSubmit={handleMealSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={mealData.date}
                    onChange={(e) => setMealData({ ...mealData, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
                  <select
                    value={mealData.mealType}
                    onChange={(e) => {
                      setMealData({ ...mealData, mealType: e.target.value });
                      setSelectedMealType(e.target.value);
                      fetchFoods(e.target.value);
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
              </div>

              {/* Food Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Foods</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {availableFoods.map((food, index) => (
                    <div
                      key={index}
                      onClick={() => handleFoodSelect(food)}
                      className="cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{food.name}</div>
                      <div className="text-sm text-gray-600">
                        {food.calories} cal • {food.carbs}g carbs • {food.protein}g protein
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Health Score: {food.healthScore}/10
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Foods */}
              {selectedFoods.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selected Foods</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFoods.map((food, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{food.name}</div>
                          <div className="text-sm text-gray-600">
                            {Math.round(food.calories * food.quantity)} cal
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={food.quantity}
                            onChange={(e) => handleFoodQuantityChange(food.name, e.target.value)}
                            className="w-16 p-1 border border-gray-300 rounded text-center"
                          />
                          <button
                            type="button"
                            onClick={() => handleFoodQuantityChange(food.name, 0)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={mealData.notes}
                  onChange={(e) => setMealData({ ...mealData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="3"
                  maxLength="500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Meal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMealForm(false);
                    setSelectedFoods([]);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Form Modal */}
      {showProfileForm && tracker?.userProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Update Profile</h2>
            <form onSubmit={handleProfileSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    min="13"
                    max="120"
                    value={profileData.age || tracker.userProfile.age}
                    onChange={(e) => setProfileData({ ...profileData, age: parseInt(e.target.value) || '' })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={profileData.weight || tracker.userProfile.weight}
                    onChange={(e) => setProfileData({ ...profileData, weight: parseFloat(e.target.value) || '' })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Update Profile
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

      {/* Medical Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <div>
            <h4 className="font-medium text-yellow-800">Nutritional Disclaimer</h4>
            <p className="text-yellow-700 text-sm mt-1">
              This food analyzer provides general nutritional information and should not replace professional dietary advice. 
              Consult with a registered dietitian or healthcare provider for personalized nutrition guidance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodAnalyzer;