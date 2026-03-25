import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const ChildVaccineTracker = () => {
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTracker, setSelectedTracker] = useState(null);
  const [upcomingConfirm, setUpcomingConfirm] = useState(null);
  const [formData, setFormData] = useState({ babyName: '', dateOfBirth: '', gender: 'male' });

  useEffect(() => { fetchTrackers(); }, []);

  const fetchTrackers = async () => {
    try {
      const response = await axios.get('/health-trackers/vaccine-tracker');
      setTrackers(response.data);
      if (response.data.length > 0) setSelectedTracker(response.data[0]);
    } catch (error) {
      console.error('Error fetching vaccine trackers:', error);
      toast.error('Failed to load vaccine trackers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/health-trackers/vaccine-tracker', formData);
      toast.success('Vaccine tracker created successfully!');
      setShowAddForm(false);
      setFormData({ babyName: '', dateOfBirth: '', gender: 'male' });
      fetchTrackers();
    } catch (error) {
      console.error('Error creating vaccine tracker:', error);
      toast.error('Failed to create vaccine tracker');
    }
  };

  const handleVaccineComplete = (trackerId, vaccineId, isCompleted, vaccine) => {
    if (isCompleted && vaccine && new Date(vaccine.dueDate) > new Date()) {
      setUpcomingConfirm({ trackerId, vaccineId, vaccineName: vaccine.vaccineName, dueDate: vaccine.dueDate });
      return;
    }
    doMarkComplete(trackerId, vaccineId, isCompleted);
  };

  const doMarkComplete = async (trackerId, vaccineId, isCompleted) => {
    try {
      await axios.patch(
        `/health-trackers/vaccine-tracker/${trackerId}/vaccine/${vaccineId}`,
        { isCompleted, completedDate: isCompleted ? new Date().toISOString() : null }
      );
      toast.success(isCompleted ? 'Vaccine marked as completed!' : 'Vaccine marked as pending');
      fetchTrackers();
    } catch (error) {
      console.error('Error updating vaccine:', error);
      toast.error('Failed to update vaccine status');
    }
  };

  const calculateAge = (dateOfBirth) => {
    const now = new Date();
    const birth = new Date(dateOfBirth);
    const diffDays = Math.ceil(Math.abs(now - birth) / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) { const m = Math.floor(diffDays / 30); return `${m} month${m > 1 ? 's' : ''}`; }
    const y = Math.floor(diffDays / 365);
    const rm = Math.floor((diffDays % 365) / 30);
    return `${y} year${y > 1 ? 's' : ''}${rm > 0 ? ` ${rm} month${rm > 1 ? 's' : ''}` : ''}`;
  };

  const generateVaccineRiskAssessment = (tracker) => {
    if (!tracker || !tracker.vaccines) return null;
    const ageInDays = Math.ceil((new Date() - new Date(tracker.dateOfBirth)) / (1000 * 60 * 60 * 24));
    const totalVaccines = tracker.vaccines.length;
    const completedVaccines = tracker.vaccines.filter(v => v.isCompleted).length;
    const overdueVaccines = tracker.vaccines.filter(v => !v.isCompleted && new Date(v.dueDate) < new Date());
    const upcomingVaccines = tracker.vaccines.filter(v => {
      if (v.isCompleted) return false;
      const diff = Math.ceil((new Date(v.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
      return diff > 0 && diff <= 30;
    });
    const expectedVaccines = tracker.vaccines.filter(v => new Date(v.dueDate) <= new Date());
    const completionRate = Math.round((completedVaccines / totalVaccines) * 100);
    const expectedCompletionRate = expectedVaccines.length > 0
      ? Math.round((completedVaccines / expectedVaccines.length) * 100) : 100;

    let riskLevel = 'Low', riskColor = 'text-green-600', riskBg = 'bg-green-50';
    let recommendations = [], urgentActions = [], preventiveActions = [];

    if (expectedVaccines.length === 0) {
      recommendations = ['Your child is on track with their vaccination schedule', 'Continue following recommended vaccine timeline', 'Prepare for upcoming vaccines as they become due', 'Maintain regular pediatric check-ups'];
      preventiveActions = ['Keep vaccination records organized', 'Set reminders for upcoming vaccine appointments', 'Discuss any concerns with your pediatrician', 'Stay informed about vaccine schedules'];
    } else if (overdueVaccines.length >= 3) {
      riskLevel = 'High'; riskColor = 'text-red-600'; riskBg = 'bg-red-50';
      urgentActions = ['Schedule immediate pediatrician appointment', 'Catch up on overdue vaccines as soon as possible', 'Discuss accelerated vaccine schedule with doctor', 'Avoid crowded places until vaccines are current'];
      recommendations = ['Prioritize critical vaccines (MMR, DPT, Polio)', 'Consider combination vaccines to catch up faster', 'Set up vaccine reminder system', 'Discuss any vaccine concerns with pediatrician'];
      preventiveActions = ['Maintain good hygiene practices', 'Ensure proper nutrition for immune system', 'Monitor for signs of vaccine-preventable diseases', 'Keep vaccination records updated'];
    } else if (overdueVaccines.length >= 2 || (expectedCompletionRate < 70 && expectedVaccines.length >= 3)) {
      riskLevel = 'Moderate'; riskColor = 'text-orange-600'; riskBg = 'bg-orange-50';
      recommendations = ['Schedule pediatrician appointment within 2 weeks', 'Complete overdue vaccines promptly', 'Review vaccination schedule with healthcare provider', 'Set up reminder system for future vaccines'];
      preventiveActions = ['Maintain regular pediatric check-ups', 'Keep vaccination records organized', 'Stay informed about vaccine schedules', 'Practice good hygiene and nutrition'];
    } else if (overdueVaccines.length >= 1) {
      riskLevel = 'Moderate'; riskColor = 'text-orange-600'; riskBg = 'bg-orange-50';
      recommendations = ['Schedule pediatrician appointment soon', 'Complete overdue vaccine(s)', 'Ensure future vaccines are on schedule', 'Set up reminder system'];
      preventiveActions = ['Maintain regular pediatric check-ups', 'Keep vaccination records organized', 'Stay informed about vaccine schedules', 'Practice good hygiene and nutrition'];
    } else {
      recommendations = ['Continue following recommended vaccine schedule', 'Maintain regular pediatric check-ups', 'Keep vaccination records up to date', 'Stay informed about any new vaccine recommendations'];
      preventiveActions = ['Continue excellent vaccination compliance', 'Maintain healthy lifestyle for child', 'Stay updated on vaccine schedules', 'Keep records organized and accessible'];
    }

    const ageRecommendations = [];
    if (ageInDays < 365) {
      ageRecommendations.push('Critical period - vaccines protect against serious infant diseases');
      ageRecommendations.push('Follow 2-4-6 month schedule strictly');
      ageRecommendations.push('Watch for fever after vaccines (normal response)');
    } else if (ageInDays < 1825) {
      ageRecommendations.push('Important booster period for long-term immunity');
      ageRecommendations.push('MMR and varicella vaccines critical before school');
      ageRecommendations.push('Annual flu vaccine recommended');
    } else {
      ageRecommendations.push('School-age vaccines important for community immunity');
      ageRecommendations.push('Consider travel vaccines if applicable');
      ageRecommendations.push('Annual flu vaccine recommended');
    }

    return {
      riskLevel, riskColor, riskBg, completionRate, expectedCompletionRate,
      totalVaccines, completedVaccines, expectedVaccines: expectedVaccines.length,
      overdueCount: overdueVaccines.length, upcomingCount: upcomingVaccines.length,
      overdueVaccines, upcomingVaccines, currentAge: calculateAge(tracker.dateOfBirth),
      recommendations, urgentActions, preventiveActions, ageRecommendations
    };
  };

  const getVaccineStatus = (vaccine) => {
    if (vaccine.isCompleted) return 'completed';
    const diffDays = Math.ceil((new Date(vaccine.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'due_soon';
    return 'upcoming';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'due_soon': return 'text-orange-600 bg-orange-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'overdue': return 'Overdue';
      case 'due_soon': return 'Due Soon';
      default: return 'Upcoming';
    }
  };

  const riskAssessment = selectedTracker ? generateVaccineRiskAssessment(selectedTracker) : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Child Vaccine Tracker</h1>
          <p className="text-gray-600">Track your child&apos;s vaccination schedule and never miss important immunizations</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          Add Child
        </button>
      </div>

      {/* Add Child Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Child</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Baby Name</label>
                <input type="text" value={formData.babyName} onChange={(e) => setFormData({ ...formData, babyName: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">Create Tracker</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {trackers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💉</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No vaccine trackers yet</h2>
          <p className="text-gray-500 mb-4">Add your child to start tracking their vaccination schedule</p>
          <button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">Add Your First Child</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Child Selection Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-4">Your Children</h3>
              <div className="space-y-2">
                {trackers.map((tracker) => (
                  <div key={tracker._id} onClick={() => setSelectedTracker(tracker)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedTracker?._id === tracker._id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    <div className="font-medium">{tracker.babyName}</div>
                    <div className="text-sm text-gray-600">Age: {calculateAge(tracker.dateOfBirth)}</div>
                    <div className="text-sm text-gray-600">Progress: {tracker.vaccines.filter(v => v.isCompleted).length}/{tracker.vaccines.length} vaccines</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vaccine Schedule */}
          <div className="lg:col-span-2">
            {selectedTracker && (
              <div className="space-y-6">
                {/* AI Risk Assessment */}
                {riskAssessment && (
                  <div className={`${riskAssessment.riskBg} border-l-4 ${riskAssessment.riskLevel === 'High' ? 'border-red-500' : riskAssessment.riskLevel === 'Moderate' ? 'border-orange-500' : 'border-green-500'} rounded-lg p-6`}>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">🧠 AI Vaccination Risk Assessment</h3>
                        <div className={`text-2xl font-bold ${riskAssessment.riskColor}`}>{riskAssessment.riskLevel} Risk</div>
                        <div className="text-sm text-gray-600">
                          {riskAssessment.expectedVaccines === 0 ? 'No vaccines due yet - On track!' : `${riskAssessment.expectedCompletionRate}% On Schedule (${riskAssessment.completedVaccines}/${riskAssessment.expectedVaccines} due vaccines)`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl mb-2">{riskAssessment.riskLevel === 'High' ? '⚠️' : riskAssessment.riskLevel === 'Moderate' ? '⚡' : '✅'}</div>
                        <div className="text-sm text-gray-600">Age: {riskAssessment.currentAge}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center"><div className="text-lg font-bold text-green-600">{riskAssessment.completedVaccines}</div><div className="text-xs text-gray-600">Completed</div></div>
                      <div className="text-center"><div className="text-lg font-bold text-red-600">{riskAssessment.overdueCount}</div><div className="text-xs text-gray-600">Overdue</div></div>
                      <div className="text-center"><div className="text-lg font-bold text-orange-600">{riskAssessment.upcomingCount}</div><div className="text-xs text-gray-600">Due Soon</div></div>
                      <div className="text-center"><div className="text-lg font-bold text-blue-600">{riskAssessment.expectedVaccines === 0 ? '100%' : `${riskAssessment.expectedCompletionRate}%`}</div><div className="text-xs text-gray-600">{riskAssessment.expectedVaccines === 0 ? 'On Track' : 'On Schedule'}</div></div>
                    </div>
                    {riskAssessment.overdueCount > 0 && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
                        <h4 className="font-semibold text-red-800 mb-2">⚠️ Overdue Vaccines:</h4>
                        <div className="space-y-1">
                          {riskAssessment.overdueVaccines.slice(0, 3).map((v, i) => (
                            <div key={i} className="text-sm text-red-700">• {v.vaccineName} (Due: {new Date(v.dueDate).toLocaleDateString()})</div>
                          ))}
                          {riskAssessment.overdueVaccines.length > 3 && <div className="text-sm text-red-700">• And {riskAssessment.overdueVaccines.length - 3} more...</div>}
                        </div>
                      </div>
                    )}
                    {riskAssessment.expectedVaccines === 0 && (
                      <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
                        <h4 className="font-semibold text-green-800 mb-2">✅ Excellent Timing!</h4>
                        <p className="text-sm text-green-700">Your child is still very young and no vaccines are due yet. You&apos;re perfectly on track with the vaccination schedule. Keep monitoring for upcoming vaccine appointments.</p>
                      </div>
                    )}
                    {riskAssessment.ageRecommendations.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-800 mb-2">📅 Age-Specific Guidance:</h4>
                        <div className="space-y-1">
                          {riskAssessment.ageRecommendations.map((rec, i) => (
                            <div key={i} className="text-sm text-blue-700">• {rec}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Vaccine List */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedTracker.babyName}&apos;s Vaccines</h2>
                      <p className="text-gray-600">Age: {calculateAge(selectedTracker.dateOfBirth)} • Progress: {selectedTracker.vaccines.filter(v => v.isCompleted).length}/{selectedTracker.vaccines.length} completed</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{Math.round((selectedTracker.vaccines.filter(v => v.isCompleted).length / selectedTracker.vaccines.length) * 100)}%</div>
                      <div className="text-sm text-gray-600">Complete</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedTracker.vaccines.map((vaccine) => {
                      const status = getVaccineStatus(vaccine);
                      return (
                        <div key={vaccine._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="font-medium">{vaccine.vaccineName}</div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>{getStatusText(status)}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">Due: {new Date(vaccine.dueDate).toLocaleDateString()} • Age: {vaccine.ageAtVaccination}</div>
                            {vaccine.completedDate && <div className="text-sm text-green-600 mt-1">Completed: {new Date(vaccine.completedDate).toLocaleDateString()}</div>}
                          </div>
                          <button
                            onClick={() => handleVaccineComplete(selectedTracker._id, vaccine._id, !vaccine.isCompleted, vaccine)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vaccine.isCompleted ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                          >
                            {vaccine.isCompleted ? 'Completed ✓' : 'Mark Complete'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Recommendations */}
                {riskAssessment && riskAssessment.riskLevel !== 'Low' && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-semibold mb-4">🧠 Detailed AI Recommendations</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {riskAssessment.urgentActions && riskAssessment.urgentActions.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-semibold text-red-800 mb-3">🚨 Urgent Actions</h4>
                          <ul className="space-y-2">
                            {riskAssessment.urgentActions.map((action, i) => (
                              <li key={i} className="flex items-start space-x-2"><span className="text-red-600 mt-1">•</span><span className="text-gray-700 text-sm">{action}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-800 mb-3">🏥 Medical Recommendations</h4>
                        <ul className="space-y-2">
                          {riskAssessment.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start space-x-2"><span className="text-orange-600 mt-1">•</span><span className="text-gray-700 text-sm">{rec}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-800 mb-3">🌱 Preventive Care</h4>
                        <ul className="space-y-2">
                          {riskAssessment.preventiveActions.map((action, i) => (
                            <li key={i} className="flex items-start space-x-2"><span className="text-green-600 mt-1">•</span><span className="text-gray-700 text-sm">{action}</span></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <span className="text-yellow-600 text-xl">⚠️</span>
                        <div>
                          <h4 className="font-medium text-yellow-800">Medical Disclaimer</h4>
                          <p className="text-yellow-700 text-sm mt-1">This AI assessment is for informational purposes only. Always consult with your pediatrician for medical advice regarding your child&apos;s vaccination schedule. Vaccine recommendations may vary based on individual health conditions and local guidelines.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Vaccine Confirmation Modal */}
      {upcomingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-lg font-bold text-gray-800">Upcoming Dose</h3>
            </div>
            <p className="text-gray-600 mb-2">
              You are marking <span className="font-semibold text-blue-700">{upcomingConfirm.vaccineName}</span> as completed.
            </p>
            <p className="text-gray-600 mb-5">
              This dose is scheduled for <span className="font-semibold">{new Date(upcomingConfirm.dueDate).toLocaleDateString()}</span>, which is an upcoming date. Are you sure you want to mark it as complete now?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  const { trackerId, vaccineId } = upcomingConfirm;
                  setUpcomingConfirm(null);
                  doMarkComplete(trackerId, vaccineId, true);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setUpcomingConfirm(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildVaccineTracker;
