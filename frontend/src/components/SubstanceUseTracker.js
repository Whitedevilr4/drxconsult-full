import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const SubstanceUseTracker = () => {
  const [entries, setEntries] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    smoking: {
      cigarettes: 0,
      cigars: 0,
      vaping: { sessions: 0, nicotineStrength: 'none' },
      other: ''
    },
    alcohol: {
      beer: 0,
      wine: 0,
      spirits: 0,
      other: ''
    },
    triggers: [],
    mood: 'neutral',
    cravingLevel: 'none',
    location: 'home',
    withOthers: false,
    notes: ''
  });

  const [profileData, setProfileData] = useState({
    age: '',
    gender: 'male',
    weight: 70,
    smokingHistory: {
      yearsSmoked: 0,
      previousAttempts: 0,
      wantsToQuit: false
    },
    drinkingHistory: {
      yearsOfDrinking: 0,
      familyHistory: false,
      wantsToReduce: false
    }
  });

  const triggerOptions = [
    { value: 'stress', label: 'Stress' },
    { value: 'social_situation', label: 'Social Situation' },
    { value: 'boredom', label: 'Boredom' },
    { value: 'habit', label: 'Habit' },
    { value: 'celebration', label: 'Celebration' },
    { value: 'work_pressure', label: 'Work Pressure' },
    { value: 'relationship_issues', label: 'Relationship Issues' },
    { value: 'anxiety', label: 'Anxiety' },
    { value: 'depression', label: 'Depression' },
    { value: 'peer_pressure', label: 'Peer Pressure' },
    { value: 'after_meals', label: 'After Meals' },
    { value: 'with_coffee', label: 'With Coffee' },
    { value: 'driving', label: 'While Driving' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchSubstanceData();
  }, []);

  const fetchSubstanceData = async () => {
    try {
      const [trackerResponse, analysisResponse] = await Promise.allSettled([
        axios.get('/health-trackers/substance-tracker'),
        axios.get('/health-trackers/substance-tracker/analysis')
      ]);
      
      if (trackerResponse.status === 'fulfilled') {
        setEntries(trackerResponse.value.data.entries || []);
        setUserProfile(trackerResponse.value.data.userProfile);
      }
      
      if (analysisResponse.status === 'fulfilled') {
        setAnalysis(analysisResponse.value.data);
      }
    } catch (error) {
      console.error('Error fetching substance data:', error);
      toast.error('Failed to load substance use data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/health-trackers/substance-tracker/profile', profileData);
      toast.success('Profile updated successfully!');
      setShowProfileForm(false);
      fetchSubstanceData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/health-trackers/substance-tracker/entry', formData);
      toast.success('Entry added successfully!');
      setShowAddForm(false);
      resetForm();
      setAnalysis(response.data.analysis);
      fetchSubstanceData();
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Failed to add entry');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await axios.delete(`/health-trackers/substance-tracker/entry/${id}`);
        toast.success('Entry deleted successfully!');
        fetchSubstanceData();
      } catch (error) {
        console.error('Error deleting entry:', error);
        toast.error('Failed to delete entry');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      smoking: {
        cigarettes: 0,
        cigars: 0,
        vaping: { sessions: 0, nicotineStrength: 'none' },
        other: ''
      },
      alcohol: {
        beer: 0,
        wine: 0,
        spirits: 0,
        other: ''
      },
      triggers: [],
      mood: 'neutral',
      cravingLevel: 'none',
      location: 'home',
      withOthers: false,
      notes: ''
    });
  };

  const handleTriggerChange = (trigger) => {
    setFormData(prev => ({
      ...prev,
      triggers: prev.triggers.includes(trigger)
        ? prev.triggers.filter(t => t !== trigger)
        : [...prev.triggers, trigger]
    }));
  };

  const formatLabel = (value) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getMoodEmoji = (mood) => {
    switch (mood) {
      case 'very_good': return '😄';
      case 'good': return '😊';
      case 'neutral': return '😐';
      case 'bad': return '😔';
      case 'very_bad': return '😢';
      default: return '😐';
    }
  };

  const getCravingColor = (level) => {
    switch (level) {
      case 'overwhelming': return 'text-red-600 bg-red-100';
      case 'strong': return 'text-orange-600 bg-orange-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'mild': return 'text-blue-600 bg-blue-100';
      case 'none': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Set Up Your Profile</h2>
          <p className="text-gray-500 mb-4">Please provide some basic information to get personalized insights</p>
          <button
            onClick={() => setShowProfileForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Set Up Profile
          </button>
        </div>

        {/* Profile Setup Modal */}
        {showProfileForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Set Up Your Profile</h2>
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
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={profileData.gender}
                      onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                      onChange={(e) => setProfileData({ ...profileData, weight: parseInt(e.target.value) || 70 })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Smoking History */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3">Smoking History</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Years Smoked</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={profileData.smokingHistory.yearsSmoked}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          smokingHistory: {
                            ...profileData.smokingHistory,
                            yearsSmoked: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Previous Quit Attempts</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={profileData.smokingHistory.previousAttempts}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          smokingHistory: {
                            ...profileData.smokingHistory,
                            previousAttempts: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={profileData.smokingHistory.wantsToQuit}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          smokingHistory: {
                            ...profileData.smokingHistory,
                            wantsToQuit: e.target.checked
                          }
                        })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">I want to quit smoking</span>
                    </label>
                  </div>
                </div>

                {/* Drinking History */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Drinking History</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Years of Drinking</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={profileData.drinkingHistory.yearsOfDrinking}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          drinkingHistory: {
                            ...profileData.drinkingHistory,
                            yearsOfDrinking: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={profileData.drinkingHistory.familyHistory}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          drinkingHistory: {
                            ...profileData.drinkingHistory,
                            familyHistory: e.target.checked
                          }
                        })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Family history of alcohol problems</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={profileData.drinkingHistory.wantsToReduce}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          drinkingHistory: {
                            ...profileData.drinkingHistory,
                            wantsToReduce: e.target.checked
                          }
                        })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">I want to reduce alcohol consumption</span>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Save Profile
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
          <h1 className="text-3xl font-bold text-gray-800">Substance Use Tracker</h1>
          <p className="text-gray-600">Track smoking and alcohol use to understand patterns and get support</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowProfileForm(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Update Profile
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Entry
          </button>
        </div>
      </div>

      {/* Add Entry Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Substance Use Entry</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
                  <select
                    value={formData.mood}
                    onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="very_bad">Very Bad 😢</option>
                    <option value="bad">Bad 😔</option>
                    <option value="neutral">Neutral 😐</option>
                    <option value="good">Good 😊</option>
                    <option value="very_good">Very Good 😄</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Craving Level</label>
                  <select
                    value={formData.cravingLevel}
                    onChange={(e) => setFormData({ ...formData, cravingLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="none">None</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="strong">Strong</option>
                    <option value="overwhelming">Overwhelming</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="bar">Bar</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="party">Party</option>
                    <option value="outdoors">Outdoors</option>
                    <option value="car">Car</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Smoking Section */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-3">🚬 Smoking</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cigarettes</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.smoking.cigarettes}
                      onChange={(e) => setFormData({
                        ...formData,
                        smoking: { ...formData.smoking, cigarettes: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cigars</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={formData.smoking.cigars}
                      onChange={(e) => setFormData({
                        ...formData,
                        smoking: { ...formData.smoking, cigars: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vaping Sessions</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.smoking.vaping.sessions}
                      onChange={(e) => setFormData({
                        ...formData,
                        smoking: {
                          ...formData.smoking,
                          vaping: { ...formData.smoking.vaping, sessions: parseInt(e.target.value) || 0 }
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Alcohol Section */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-3">🍺 Alcohol</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Beer (drinks)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={formData.alcohol.beer}
                      onChange={(e) => setFormData({
                        ...formData,
                        alcohol: { ...formData.alcohol, beer: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wine (glasses)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={formData.alcohol.wine}
                      onChange={(e) => setFormData({
                        ...formData,
                        alcohol: { ...formData.alcohol, wine: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Spirits (shots)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={formData.alcohol.spirits}
                      onChange={(e) => setFormData({
                        ...formData,
                        alcohol: { ...formData.alcohol, spirits: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
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
                        onChange={() => handleTriggerChange(option.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.withOthers}
                    onChange={(e) => setFormData({ ...formData, withOthers: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">With other people</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows="3"
                  maxLength="500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
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

      {/* Profile Form Modal */}
      {showProfileForm && (
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
                    value={profileData.age || userProfile.age}
                    onChange={(e) => setProfileData({ ...profileData, age: parseInt(e.target.value) || '' })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={profileData.gender || userProfile.gender}
                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
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

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No entries yet</h2>
          <p className="text-gray-500 mb-4">Start tracking to get personalized insights and support</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Your First Entry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Risk Analysis */}
          {analysis && (
            <div className={`${analysis.riskBg} border-l-4 ${analysis.overallRiskLevel === 'High' ? 'border-red-500' : analysis.overallRiskLevel === 'Moderate' ? 'border-orange-500' : 'border-green-500'} rounded-lg p-6`}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    🧠 AI Substance Use Risk Analysis
                  </h3>
                  <div className={`text-2xl font-bold ${analysis.riskColor}`}>
                    {analysis.overallRiskLevel} Risk
                  </div>
                  <div className="text-sm text-gray-600">
                    Based on {analysis.daysAnalyzed} days of data
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl mb-2">
                    {analysis.overallRiskLevel === 'High' ? '⚠️' : analysis.overallRiskLevel === 'Moderate' ? '⚡' : '✅'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Weekly alcohol: {analysis.avgAlcoholUnitsPerWeek} units
                  </div>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{analysis.avgCigarettesPerDay}</div>
                  <div className="text-xs text-gray-600">Avg Cigarettes/Day</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{analysis.totalVapingSessions}</div>
                  <div className="text-xs text-gray-600">Vaping Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{analysis.avgAlcoholUnitsPerWeek}</div>
                  <div className="text-xs text-gray-600">Weekly Alcohol Units</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{analysis.bingeDays}</div>
                  <div className="text-xs text-gray-600">Binge Days</div>
                </div>
              </div>

              {/* Health Warnings */}
              {analysis.healthWarnings.length > 0 && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Health Warnings:</h4>
                  <div className="space-y-1">
                    {analysis.healthWarnings.map((warning, index) => (
                      <div key={index} className="text-sm text-red-700">{warning}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Triggers */}
              {analysis.topTriggers.length > 0 && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">🎯 Common Triggers:</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topTriggers.map((trigger, index) => (
                      <span key={index} className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-sm">
                        {formatLabel(trigger)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations and Strategies */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Recommendations:</h4>
                  <div className="space-y-1">
                    {analysis.recommendations.map((rec, index) => (
                      <div key={index} className="text-sm text-blue-700">• {rec}</div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-semibold text-green-800 mb-2">🎯 Quit Strategies:</h4>
                  <div className="space-y-1">
                    {analysis.quitStrategies.slice(0, 5).map((strategy, index) => (
                      <div key={index} className="text-sm text-green-700">• {strategy}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Health Benefits */}
              {analysis.healthBenefits.length > 0 && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <h4 className="font-semibold text-green-800 mb-2">🌟 Health Benefits of Quitting:</h4>
                  <div className="space-y-1">
                    {analysis.healthBenefits.map((benefit, index) => (
                      <div key={index} className="text-sm text-green-700">• {benefit}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Entries */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Recent Entries</h2>
            <div className="space-y-4">
              {entries.slice(0, 10).map((entry) => (
                <div key={entry._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="font-medium">
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                        <span className="text-lg">{getMoodEmoji(entry.mood)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCravingColor(entry.cravingLevel)}`}>
                          {formatLabel(entry.cravingLevel)} craving
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">Cigarettes:</span> {entry.smoking.cigarettes}
                        </div>
                        <div>
                          <span className="font-medium">Vaping:</span> {entry.smoking.vaping.sessions}
                        </div>
                        <div>
                          <span className="font-medium">Beer:</span> {entry.alcohol.beer}
                        </div>
                        <div>
                          <span className="font-medium">Wine:</span> {entry.alcohol.wine}
                        </div>
                      </div>

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

          {/* Support Resources */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-blue-800 mb-4">🆘 Support Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Smoking Cessation:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>• National Quitline: 1-800-QUIT-NOW</div>
                  <div>• Smokefree.gov - Free resources and support</div>
                  <div>• QuitGuide App - Track progress and get tips</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Alcohol Support:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>• SAMHSA Helpline: 1-800-662-4357</div>
                  <div>• Alcoholics Anonymous: aa.org</div>
                  <div>• SMART Recovery: smartrecovery.org</div>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div>
                <h4 className="font-medium text-yellow-800">Medical Disclaimer</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  This tracker is for informational purposes only. If you're struggling with substance use, 
                  please consult with healthcare professionals or addiction specialists for proper treatment and support.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubstanceUseTracker;