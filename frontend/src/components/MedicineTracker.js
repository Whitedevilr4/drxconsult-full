import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const MedicineTracker = () => {
  const [medicines, setMedicines] = useState([]);
  const [medicineLog, setMedicineLog] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    medicineName: '',
    medicineType: 'tablet',
    purpose: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    schedule: [{ time: '08:00', dosage: '1 tablet', instructions: '' }],
    prescribedBy: '',
    sideEffects: [],
    notes: ''
  });

  const medicineTypes = [
    { value: 'tablet', label: 'Tablet' },
    { value: 'capsule', label: 'Capsule' },
    { value: 'syrup', label: 'Syrup' },
    { value: 'injection', label: 'Injection' },
    { value: 'drops', label: 'Drops' },
    { value: 'cream', label: 'Cream/Ointment' },
    { value: 'inhaler', label: 'Inhaler' },
    { value: 'other', label: 'Other' }
  ];

  const sideEffectOptions = [
    { value: 'nausea', label: 'Nausea' },
    { value: 'dizziness', label: 'Dizziness' },
    { value: 'headache', label: 'Headache' },
    { value: 'drowsiness', label: 'Drowsiness' },
    { value: 'stomach_upset', label: 'Stomach Upset' },
    { value: 'rash', label: 'Rash' },
    { value: 'fatigue', label: 'Fatigue' },
    { value: 'insomnia', label: 'Insomnia' },
    { value: 'dry_mouth', label: 'Dry Mouth' },
    { value: 'constipation', label: 'Constipation' },
    { value: 'diarrhea', label: 'Diarrhea' },
    { value: 'loss_of_appetite', label: 'Loss of Appetite' },
    { value: 'weight_gain', label: 'Weight Gain' },
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchMedicineData();
  }, []);

  const fetchMedicineData = async () => {
    try {
      const [trackerResponse, analysisResponse] = await Promise.all([
        axios.get('/health-trackers/medicine-tracker'),
        axios.get('/health-trackers/medicine-tracker/analysis')
      ]);
      
      setMedicines(trackerResponse.data.medicines || []);
      setMedicineLog(trackerResponse.data.medicineLog || []);
      setAnalysis(analysisResponse.data);
    } catch (error) {
      console.error('Error fetching medicine data:', error);
      toast.error('Failed to load medicine data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/health-trackers/medicine-tracker/medicine', formData);
      toast.success('Medicine added successfully!');
      setShowAddForm(false);
      resetForm();
      fetchMedicineData();
    } catch (error) {
      console.error('Error adding medicine:', error);
      toast.error('Failed to add medicine');
    }
  };

  const handleLogUpdate = async (logId, status) => {
    try {
      const updateData = {
        status,
        takenAt: status === 'taken' ? new Date().toISOString() : null
      };
      
      await axios.patch(`/health-trackers/medicine-tracker/log/${logId}`, updateData);
      toast.success(`Medicine marked as ${status}!`);
      fetchMedicineData();
    } catch (error) {
      console.error('Error updating medicine log:', error);
      toast.error('Failed to update medicine status');
    }
  };

  const handleDeleteMedicine = async (medicineId) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
      try {
        await axios.delete(`/health-trackers/medicine-tracker/medicine/${medicineId}`);
        toast.success('Medicine deleted successfully!');
        fetchMedicineData();
      } catch (error) {
        console.error('Error deleting medicine:', error);
        toast.error('Failed to delete medicine');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      medicineName: '',
      medicineType: 'tablet',
      purpose: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      schedule: [{ time: '08:00', dosage: '1 tablet', instructions: '' }],
      prescribedBy: '',
      sideEffects: [],
      notes: ''
    });
  };

  const addScheduleSlot = () => {
    setFormData({
      ...formData,
      schedule: [...formData.schedule, { time: '12:00', dosage: '1 tablet', instructions: '' }]
    });
  };

  const removeScheduleSlot = (index) => {
    setFormData({
      ...formData,
      schedule: formData.schedule.filter((_, i) => i !== index)
    });
  };

  const updateScheduleSlot = (index, field, value) => {
    const newSchedule = [...formData.schedule];
    newSchedule[index][field] = value;
    setFormData({ ...formData, schedule: newSchedule });
  };

  const handleSideEffectChange = (sideEffect) => {
    setFormData(prev => ({
      ...prev,
      sideEffects: prev.sideEffects.includes(sideEffect)
        ? prev.sideEffects.filter(se => se !== sideEffect)
        : [...prev.sideEffects, sideEffect]
    }));
  };

  const getTodaysDoses = () => {
    const today = new Date().toDateString();
    return medicineLog.filter(log => 
      new Date(log.scheduledDate).toDateString() === today
    ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'taken': return 'text-green-600 bg-green-100';
      case 'missed': return 'text-red-600 bg-red-100';
      case 'skipped': return 'text-gray-600 bg-gray-100';
      case 'due': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatLabel = (value) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

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
          <h1 className="text-3xl font-bold text-gray-800">Medicine Tracker</h1>
          <p className="text-gray-600">Track your medications and never miss a dose</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Medicine
        </button>
      </div>

      {/* Add Medicine Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Medicine</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medicine Name</label>
                  <input
                    type="text"
                    value={formData.medicineName}
                    onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medicine Type</label>
                  <select
                    value={formData.medicineType}
                    onChange={(e) => setFormData({ ...formData, medicineType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {medicineTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purpose/Condition</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., High blood pressure, Pain relief"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prescribed By</label>
                  <input
                    type="text"
                    value={formData.prescribedBy}
                    onChange={(e) => setFormData({ ...formData, prescribedBy: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Doctor's name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Daily Schedule</label>
                  <button
                    type="button"
                    onClick={addScheduleSlot}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm"
                  >
                    Add Time
                  </button>
                </div>
                {formData.schedule.map((slot, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateScheduleSlot(index, 'time', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dosage</label>
                      <input
                        type="text"
                        value={slot.dosage}
                        onChange={(e) => updateScheduleSlot(index, 'dosage', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="1 tablet"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Instructions</label>
                      <input
                        type="text"
                        value={slot.instructions}
                        onChange={(e) => updateScheduleSlot(index, 'instructions', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="with food"
                      />
                    </div>
                    <div className="flex items-end">
                      {formData.schedule.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeScheduleSlot(index)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-2 rounded text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Side Effects */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Possible Side Effects</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {sideEffectOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.sideEffects.includes(option.value)}
                        onChange={() => handleSideEffectChange(option.value)}
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
                  Add Medicine
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

      {medicines.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💊</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No medicines tracked yet</h2>
          <p className="text-gray-500 mb-4">Add your medications to track doses and adherence</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Your First Medicine
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Adherence Analysis */}
          {analysis && (
            <div className={`${analysis.riskBg} border-l-4 ${analysis.riskLevel === 'High' ? 'border-red-500' : analysis.riskLevel === 'Moderate' ? 'border-orange-500' : 'border-green-500'} rounded-lg p-6`}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    🧠 AI Medication Adherence Analysis
                  </h3>
                  <div className={`text-2xl font-bold ${analysis.riskColor}`}>
                    {analysis.riskLevel} Risk
                  </div>
                  <div className="text-sm text-gray-600">
                    Based on {analysis.daysAnalyzed} days of medication data
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl mb-2">
                    {analysis.riskLevel === 'High' ? '⚠️' : analysis.riskLevel === 'Moderate' ? '⚡' : '✅'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Adherence: {analysis.adherenceRate}%
                  </div>
                </div>
              </div>

              {/* Adherence Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{analysis.taken}</div>
                  <div className="text-xs text-gray-600">Taken</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{analysis.missed}</div>
                  <div className="text-xs text-gray-600">Missed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{analysis.onTimeRate}%</div>
                  <div className="text-xs text-gray-600">On Time</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{analysis.activeMedicines}</div>
                  <div className="text-xs text-gray-600">Active Meds</div>
                </div>
              </div>

              {/* Warnings */}
              {analysis.warnings.length > 0 && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Important Warnings:</h4>
                  <div className="space-y-1">
                    {analysis.warnings.map((warning, index) => (
                      <div key={index} className="text-sm text-red-700">• {warning}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Recommendations:</h4>
                <div className="space-y-1">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className="text-sm text-blue-700">• {rec}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Today's Doses */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Today's Medication Schedule</h2>
            {getTodaysDoses().length === 0 ? (
              <p className="text-gray-500 text-center py-8">No medications scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {getTodaysDoses().map((log) => {
                  const medicine = medicines.find(m => m._id === log.medicineId);
                  return (
                    <div key={log._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="font-medium">{medicine?.medicineName}</div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                            {formatLabel(log.status)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatTime(log.scheduledTime)} • {medicine?.schedule.find(s => s.time === log.scheduledTime)?.dosage}
                        </div>
                        {medicine?.schedule.find(s => s.time === log.scheduledTime)?.instructions && (
                          <div className="text-sm text-gray-500 mt-1">
                            {medicine.schedule.find(s => s.time === log.scheduledTime).instructions}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {log.status === 'due' && (
                          <>
                            <button
                              onClick={() => handleLogUpdate(log._id, 'taken')}
                              className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm transition-colors"
                            >
                              Mark Taken
                            </button>
                            <button
                              onClick={() => handleLogUpdate(log._id, 'missed')}
                              className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm transition-colors"
                            >
                              Mark Missed
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Medicines */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Active Medicines</h2>
            <div className="space-y-4">
              {medicines.filter(med => med.isActive).map((medicine) => (
                <div key={medicine._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="font-medium text-lg">{medicine.medicineName}</div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {formatLabel(medicine.medicineType)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Purpose:</span> {medicine.purpose}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Duration:</span> {new Date(medicine.startDate).toLocaleDateString()} - {new Date(medicine.endDate).toLocaleDateString()}
                      </div>
                      {medicine.prescribedBy && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Prescribed by:</span> {medicine.prescribedBy}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Schedule:</span>
                        <div className="mt-1 space-y-1">
                          {medicine.schedule.map((slot, index) => (
                            <div key={index} className="ml-2">
                              • {formatTime(slot.time)} - {slot.dosage} {slot.instructions && `(${slot.instructions})`}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMedicine(medicine._id)}
                      className="text-red-600 hover:text-red-800 ml-4"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div>
                <h4 className="font-medium text-yellow-800">Medical Disclaimer</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  This medication tracker is for informational purposes only. Always follow your doctor's instructions 
                  and consult with healthcare professionals before making any changes to your medication regimen.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineTracker;