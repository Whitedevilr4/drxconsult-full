import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const OverallHealthTracker = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symptoms: {
      headache: { severity: 'none', duration: 0, type: 'tension' },
      runnyNose: { severity: 'none', color: 'clear' },
      sneezing: { severity: 'none', frequency: 'occasional' },
      coughing: { severity: 'none', type: 'dry', duration: 0 },
      fever: { temperature: 0, duration: 0, pattern: 'continuous' },
      pain: { severity: 'none', location: [], type: 'dull' }
    },
    overallWellbeing: 'good',
    energyLevel: 'moderate',
    sleepQuality: 'fair',
    appetiteLevel: 'normal',
    stressLevel: 'moderate',
    hydrationLevel: 'adequate',
    additionalSymptoms: [],
    triggers: [],
    remediesTried: [],
    notes: ''
  });

  const additionalSymptomsOptions = [
    { value: 'nausea', label: 'Nausea' },
    { value: 'vomiting', label: 'Vomiting' },
    { value: 'diarrhea', label: 'Diarrhea' },
    { value: 'constipation', label: 'Constipation' },
    { value: 'dizziness', label: 'Dizziness' },
    { value: 'fatigue', label: 'Fatigue' },
    { value: 'chills', label: 'Chills' },
    { value: 'sweating', label: 'Sweating' },
    { value: 'shortness_of_breath', label: 'Shortness of Breath' },
    { value: 'chest_tightness', label: 'Chest Tightness' },
    { value: 'rash', label: 'Rash' },
    { value: 'itching', label: 'Itching' },
    { value: 'swelling', label: 'Swelling' },
    { value: 'muscle_aches', label: 'Muscle Aches' },
    { value: 'joint_stiffness', label: 'Joint Stiffness' },
    { value: 'confusion', label: 'Confusion' },
    { value: 'irritability', label: 'Irritability' },
    { value: 'loss_of_taste', label: 'Loss of Taste' },
    { value: 'loss_of_smell', label: 'Loss of Smell' },
    { value: 'sore_throat', label: 'Sore Throat' }
  ];

  const triggerOptions = [
    { value: 'weather_change', label: 'Weather Change' },
    { value: 'stress', label: 'Stress' },
    { value: 'lack_of_sleep', label: 'Lack of Sleep' },
    { value: 'poor_diet', label: 'Poor Diet' },
    { value: 'dehydration', label: 'Dehydration' },
    { value: 'allergens', label: 'Allergens' },
    { value: 'pollution', label: 'Pollution' },
    { value: 'exercise', label: 'Exercise' },
    { value: 'medication', label: 'Medication' },
    { value: 'alcohol', label: 'Alcohol' },
    { value: 'smoking', label: 'Smoking' },
    { value: 'travel', label: 'Travel' },
    { value: 'work_environment', label: 'Work Environment' },
    { value: 'seasonal_change', label: 'Seasonal Change' },
    { value: 'hormonal_change', label: 'Hormonal Change' }
  ];

  const remediesOptions = [
    { value: 'rest', label: 'Rest' },
    { value: 'hydration', label: 'Hydration' },
    { value: 'pain_medication', label: 'Pain Medication' },
    { value: 'cold_compress', label: 'Cold Compress' },
    { value: 'warm_compress', label: 'Warm Compress' },
    { value: 'steam_inhalation', label: 'Steam Inhalation' },
    { value: 'saltwater_gargle', label: 'Saltwater Gargle' },
    { value: 'honey', label: 'Honey' },
    { value: 'ginger_tea', label: 'Ginger Tea' },
    { value: 'herbal_tea', label: 'Herbal Tea' },
    { value: 'vitamin_c', label: 'Vitamin C' },
    { value: 'throat_lozenges', label: 'Throat Lozenges' },
    { value: 'nasal_spray', label: 'Nasal Spray' },
    { value: 'humidifier', label: 'Humidifier' },
    { value: 'essential_oils', label: 'Essential Oils' }
  ];

  const painLocationOptions = [
    { value: 'head', label: 'Head' },
    { value: 'neck', label: 'Neck' },
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'abdomen', label: 'Abdomen' },
    { value: 'arms', label: 'Arms' },
    { value: 'legs', label: 'Legs' },
    { value: 'joints', label: 'Joints' },
    { value: 'muscles', label: 'Muscles' },
    { value: 'throat', label: 'Throat' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const response = await axios.get('/health-trackers/overall-health-tracker');
      setEntries(response.data.entries || []);
    } catch (error) {
      console.error('Error fetching health data:', error);
      toast.error('Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/health-trackers/overall-health-tracker', formData);
      toast.success('Health entry added successfully!');
      setRecommendations(response.data.recommendations);
      setSelectedEntry(response.data.entry);
      setShowAddForm(false);
      resetForm();
      fetchHealthData();
    } catch (error) {
      console.error('Error adding health entry:', error);
      toast.error('Failed to add health entry');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this health entry?')) {
      try {
        await axios.delete(`/health-trackers/overall-health-tracker/${id}`);
        toast.success('Health entry deleted successfully!');
        fetchHealthData();
      } catch (error) {
        console.error('Error deleting health entry:', error);
        toast.error('Failed to delete health entry');
      }
    }
  };

  const getRecommendations = async (entryId) => {
    try {
      const response = await axios.get(`/health-trackers/overall-health-tracker/${entryId}/recommendations`);
      setRecommendations(response.data);
      setSelectedEntry(entries.find(e => e._id === entryId));
    } catch (error) {
      console.error('Error getting recommendations:', error);
      toast.error('Failed to get recommendations');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      symptoms: {
        headache: { severity: 'none', duration: 0, type: 'tension' },
        runnyNose: { severity: 'none', color: 'clear' },
        sneezing: { severity: 'none', frequency: 'occasional' },
        coughing: { severity: 'none', type: 'dry', duration: 0 },
        fever: { temperature: 0, duration: 0, pattern: 'continuous' },
        pain: { severity: 'none', location: [], type: 'dull' }
      },
      overallWellbeing: 'good',
      energyLevel: 'moderate',
      sleepQuality: 'fair',
      appetiteLevel: 'normal',
      stressLevel: 'moderate',
      hydrationLevel: 'adequate',
      additionalSymptoms: [],
      triggers: [],
      remediesTried: [],
      notes: ''
    });
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handlePainLocationChange = (location) => {
    setFormData(prev => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        pain: {
          ...prev.symptoms.pain,
          location: prev.symptoms.pain.location.includes(location)
            ? prev.symptoms.pain.location.filter(loc => loc !== location)
            : [...prev.symptoms.pain.location, location]
        }
      }
    }));
  };

  const getSymptomSeverityColor = (severity) => {
    switch (severity) {
      case 'severe': return 'text-red-600 bg-red-100';
      case 'moderate': return 'text-orange-600 bg-orange-100';
      case 'mild': return 'text-yellow-600 bg-yellow-100';
      case 'none': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getWellbeingColor = (wellbeing) => {
    switch (wellbeing) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'very_poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatLabel = (value) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const hasActiveSymptoms = (symptoms) => {
    return Object.values(symptoms).some(symptom => {
      if (symptom.severity && symptom.severity !== 'none') return true;
      if (symptom.temperature && symptom.temperature > 98.6) return true;
      return false;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Overall Health Tracker</h1>
          <p className="text-gray-600">Track symptoms and get AI-powered remedy recommendations</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Health Entry
        </button>
      </div>

      {/* Add Health Entry Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Health Entry</h2>
            <form onSubmit={handleSubmit}>
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overall Wellbeing</label>
                  <select
                    value={formData.overallWellbeing}
                    onChange={(e) => setFormData({ ...formData, overallWellbeing: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="very_poor">Very Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Energy Level</label>
                  <select
                    value={formData.energyLevel}
                    onChange={(e) => setFormData({ ...formData, energyLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="very_low">Very Low</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="very_high">Very High</option>
                  </select>
                </div>
              </div>

              {/* Symptoms Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Symptoms</h3>
                
                {/* Headache */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium mb-3">🤕 Headache</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                      <select
                        value={formData.symptoms.headache.severity}
                        onChange={(e) => setFormData({
                          ...formData,
                          symptoms: {
                            ...formData.symptoms,
                            headache: { ...formData.symptoms.headache, severity: e.target.value }
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="none">None</option>
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                      <input
                        type="number"
                        min="0"
                        max="72"
                        value={formData.symptoms.headache.duration}
                        onChange={(e) => setFormData({
                          ...formData,
                          symptoms: {
                            ...formData.symptoms,
                            headache: { ...formData.symptoms.headache, duration: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={formData.symptoms.headache.type}
                        onChange={(e) => setFormData({
                          ...formData,
                          symptoms: {
                            ...formData.symptoms,
                            headache: { ...formData.symptoms.headache, type: e.target.value }
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="tension">Tension</option>
                        <option value="migraine">Migraine</option>
                        <option value="cluster">Cluster</option>
                        <option value="sinus">Sinus</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fever */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium mb-3">🌡️ Fever</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
                      <input
                        type="number"
                        min="95"
                        max="110"
                        step="0.1"
                        value={formData.symptoms.fever.temperature}
                        onChange={(e) => setFormData({
                          ...formData,
                          symptoms: {
                            ...formData.symptoms,
                            fever: { ...formData.symptoms.fever, temperature: parseFloat(e.target.value) || 0 }
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                      <input
                        type="number"
                        min="0"
                        max="168"
                        value={formData.symptoms.fever.duration}
                        onChange={(e) => setFormData({
                          ...formData,
                          symptoms: {
                            ...formData.symptoms,
                            fever: { ...formData.symptoms.fever, duration: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pattern</label>
                      <select
                        value={formData.symptoms.fever.pattern}
                        onChange={(e) => setFormData({
                          ...formData,
                          symptoms: {
                            ...formData.symptoms,
                            fever: { ...formData.symptoms.fever, pattern: e.target.value }
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="continuous">Continuous</option>
                        <option value="intermittent">Intermittent</option>
                        <option value="remittent">Remittent</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Other Symptoms - Simplified */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">🤧 Runny Nose</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                        <select
                          value={formData.symptoms.runnyNose.severity}
                          onChange={(e) => setFormData({
                            ...formData,
                            symptoms: {
                              ...formData.symptoms,
                              runnyNose: { ...formData.symptoms.runnyNose, severity: e.target.value }
                            }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                        <select
                          value={formData.symptoms.runnyNose.color}
                          onChange={(e) => setFormData({
                            ...formData,
                            symptoms: {
                              ...formData.symptoms,
                              runnyNose: { ...formData.symptoms.runnyNose, color: e.target.value }
                            }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="clear">Clear</option>
                          <option value="yellow">Yellow</option>
                          <option value="green">Green</option>
                          <option value="bloody">Bloody</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">🤧 Sneezing</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                        <select
                          value={formData.symptoms.sneezing.severity}
                          onChange={(e) => setFormData({
                            ...formData,
                            symptoms: {
                              ...formData.symptoms,
                              sneezing: { ...formData.symptoms.sneezing, severity: e.target.value }
                            }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                        <select
                          value={formData.symptoms.sneezing.frequency}
                          onChange={(e) => setFormData({
                            ...formData,
                            symptoms: {
                              ...formData.symptoms,
                              sneezing: { ...formData.symptoms.sneezing, frequency: e.target.value }
                            }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="occasional">Occasional</option>
                          <option value="frequent">Frequent</option>
                          <option value="constant">Constant</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">😷 Coughing</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                        <select
                          value={formData.symptoms.coughing.severity}
                          onChange={(e) => setFormData({
                            ...formData,
                            symptoms: {
                              ...formData.symptoms,
                              coughing: { ...formData.symptoms.coughing, severity: e.target.value }
                            }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={formData.symptoms.coughing.type}
                          onChange={(e) => setFormData({
                            ...formData,
                            symptoms: {
                              ...formData.symptoms,
                              coughing: { ...formData.symptoms.coughing, type: e.target.value }
                            }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="dry">Dry</option>
                          <option value="productive">Productive</option>
                          <option value="barking">Barking</option>
                          <option value="whooping">Whooping</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={formData.symptoms.coughing.duration}
                          onChange={(e) => setFormData({
                            ...formData,
                            symptoms: {
                              ...formData.symptoms,
                              coughing: { ...formData.symptoms.coughing, duration: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">😣 Pain</h4>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                        <select
                          value={formData.symptoms.pain.severity}
                          onChange={(e) => setFormData({
                            ...formData,
                            symptoms: {
                              ...formData.symptoms,
                              pain: { ...formData.symptoms.pain, severity: e.target.value }
                            }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={formData.symptoms.pain.type}
                          onChange={(e) => setFormData({
                            ...formData,
                            symptoms: {
                              ...formData.symptoms,
                              pain: { ...formData.symptoms.pain, type: e.target.value }
                            }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="sharp">Sharp</option>
                          <option value="dull">Dull</option>
                          <option value="throbbing">Throbbing</option>
                          <option value="burning">Burning</option>
                          <option value="cramping">Cramping</option>
                          <option value="stabbing">Stabbing</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location (select all that apply)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {painLocationOptions.map(option => (
                          <label key={option.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.symptoms.pain.location.includes(option.value)}
                              onChange={() => handlePainLocationChange(option.value)}
                              className="rounded"
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Health Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Quality</label>
                  <select
                    value={formData.sleepQuality}
                    onChange={(e) => setFormData({ ...formData, sleepQuality: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="very_poor">Very Poor</option>
                    <option value="poor">Poor</option>
                    <option value="fair">Fair</option>
                    <option value="good">Good</option>
                    <option value="excellent">Excellent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Appetite Level</label>
                  <select
                    value={formData.appetiteLevel}
                    onChange={(e) => setFormData({ ...formData, appetiteLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="very_poor">Very Poor</option>
                    <option value="poor">Poor</option>
                    <option value="normal">Normal</option>
                    <option value="good">Good</option>
                    <option value="excessive">Excessive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hydration Level</label>
                  <select
                    value={formData.hydrationLevel}
                    onChange={(e) => setFormData({ ...formData, hydrationLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="very_low">Very Low</option>
                    <option value="low">Low</option>
                    <option value="adequate">Adequate</option>
                    <option value="good">Good</option>
                    <option value="excellent">Excellent</option>
                  </select>
                </div>
              </div>

              {/* Additional Symptoms */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Symptoms (select all that apply)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {additionalSymptomsOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.additionalSymptoms.includes(option.value)}
                        onChange={() => handleCheckboxChange('additionalSymptoms', option.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Triggers */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Possible Triggers (select all that apply)</label>
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

              {/* Remedies Tried */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Remedies Already Tried (select all that apply)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {remediesOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.remediesTried.includes(option.value)}
                        onChange={() => handleCheckboxChange('remediesTried', option.value)}
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  maxLength="1000"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Entry & Get Recommendations
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

      {/* Recommendations Modal */}
      {recommendations && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🧠 AI Health Recommendations</h2>
              <button
                onClick={() => setRecommendations(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Entry Summary</h3>
              <p className="text-blue-700 text-sm">
                Date: {new Date(selectedEntry.date).toLocaleDateString()} • 
                Overall Wellbeing: {formatLabel(selectedEntry.overallWellbeing)} • 
                Energy: {formatLabel(selectedEntry.energyLevel)}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Immediate Actions */}
              {recommendations.immediate && recommendations.immediate.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                    🚨 Immediate Actions
                  </h4>
                  <ul className="space-y-2">
                    {recommendations.immediate.map((action, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-red-600 mt-1">•</span>
                        <span className="text-gray-700 text-sm">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Home Remedies */}
              {recommendations.homeRemedies && recommendations.homeRemedies.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                    🏠 Home Remedies
                  </h4>
                  <ul className="space-y-2">
                    {recommendations.homeRemedies.map((remedy, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-green-600 mt-1">•</span>
                        <span className="text-gray-700 text-sm">{remedy}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Medications */}
              {recommendations.medications && recommendations.medications.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    💊 Medication Options
                  </h4>
                  <ul className="space-y-2">
                    {recommendations.medications.map((med, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700 text-sm">{med}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lifestyle Changes */}
              {recommendations.lifestyle && recommendations.lifestyle.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                    🌱 Lifestyle Changes
                  </h4>
                  <ul className="space-y-2">
                    {recommendations.lifestyle.map((change, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-purple-600 mt-1">•</span>
                        <span className="text-gray-700 text-sm">{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prevention */}
              {recommendations.prevention && recommendations.prevention.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                    🛡️ Prevention Tips
                  </h4>
                  <ul className="space-y-2">
                    {recommendations.prevention.map((tip, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-yellow-600 mt-1">•</span>
                        <span className="text-gray-700 text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* When to Seek Help */}
              {recommendations.whenToSeekHelp && recommendations.whenToSeekHelp.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                    🏥 When to Seek Medical Help
                  </h4>
                  <ul className="space-y-2">
                    {recommendations.whenToSeekHelp.map((warning, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-orange-600 mt-1">•</span>
                        <span className="text-gray-700 text-sm">{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Medical Disclaimer */}
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <span className="text-gray-600 text-xl">⚠️</span>
                <div>
                  <h4 className="font-medium text-gray-800">Medical Disclaimer</h4>
                  <p className="text-gray-700 text-sm mt-1">
                    These recommendations are for informational purposes only and not a substitute for professional medical advice. 
                    Always consult with a healthcare provider for proper diagnosis and treatment, especially for persistent or severe symptoms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏥</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No health entries yet</h2>
          <p className="text-gray-500 mb-4">Start tracking your symptoms to get personalized remedy recommendations</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Your First Health Entry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Health Entries */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Health History</h2>
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="font-medium">
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWellbeingColor(entry.overallWellbeing)}`}>
                          {formatLabel(entry.overallWellbeing)}
                        </span>
                        {hasActiveSymptoms(entry.symptoms) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                            Has Symptoms
                          </span>
                        )}
                      </div>
                      
                      {/* Active Symptoms Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">Energy:</span> {formatLabel(entry.energyLevel)}
                        </div>
                        <div>
                          <span className="font-medium">Sleep:</span> {formatLabel(entry.sleepQuality)}
                        </div>
                        <div>
                          <span className="font-medium">Appetite:</span> {formatLabel(entry.appetiteLevel)}
                        </div>
                        <div>
                          <span className="font-medium">Hydration:</span> {formatLabel(entry.hydrationLevel)}
                        </div>
                      </div>

                      {/* Symptom Details */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {entry.symptoms.headache.severity !== 'none' && (
                          <span className={`px-2 py-1 rounded-full text-xs ${getSymptomSeverityColor(entry.symptoms.headache.severity)}`}>
                            Headache: {formatLabel(entry.symptoms.headache.severity)}
                          </span>
                        )}
                        {entry.symptoms.fever.temperature > 98.6 && (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-600">
                            Fever: {entry.symptoms.fever.temperature}°F
                          </span>
                        )}
                        {entry.symptoms.coughing.severity !== 'none' && (
                          <span className={`px-2 py-1 rounded-full text-xs ${getSymptomSeverityColor(entry.symptoms.coughing.severity)}`}>
                            Cough: {formatLabel(entry.symptoms.coughing.severity)}
                          </span>
                        )}
                        {entry.symptoms.runnyNose.severity !== 'none' && (
                          <span className={`px-2 py-1 rounded-full text-xs ${getSymptomSeverityColor(entry.symptoms.runnyNose.severity)}`}>
                            Runny Nose: {formatLabel(entry.symptoms.runnyNose.severity)}
                          </span>
                        )}
                        {entry.symptoms.pain.severity !== 'none' && (
                          <span className={`px-2 py-1 rounded-full text-xs ${getSymptomSeverityColor(entry.symptoms.pain.severity)}`}>
                            Pain: {formatLabel(entry.symptoms.pain.severity)}
                          </span>
                        )}
                      </div>

                      {entry.notes && (
                        <div className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Notes:</span> {entry.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => getRecommendations(entry._id)}
                        className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded text-sm transition-colors"
                      >
                        Get Remedies
                      </button>
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </div>
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

export default OverallHealthTracker;