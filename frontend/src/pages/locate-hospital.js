import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import axios from '../lib/axios';

export default function LocateHospital() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalRadius, setHospitalRadius] = useState(null);
  const [formData, setFormData] = useState({
    queryType: 'bed_availability',
    bedType: 'any',
    specialization: '',
    description: ''
  });

  // Only called after location is granted — tries 5km then 10km
  const fetchNearbyHospitals = async (lat, lng) => {
    try {
      // Try 5km first
      let res = await axios.post('/hospital-queries/nearby-hospitals', {
        latitude: lat, longitude: lng, radius: 5
      });
      if (res.data && res.data.length > 0) {
        setHospitals(res.data);
        setHospitalRadius(5);
        return;
      }
      // Fall back to 10km
      res = await axios.post('/hospital-queries/nearby-hospitals', {
        latitude: lat, longitude: lng, radius: 10
      });
      setHospitals(res.data || []);
      setHospitalRadius(10);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    }
  };

  // Direct user gesture — browser popup fires from this click
  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setLocating(false);
        fetchNearbyHospitals(latitude, longitude);
      },
      (error) => {
        console.log('Geolocation error — code:', error.code, error.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/hospital-queries', {
        ...formData,
        userLatitude: location?.latitude,
        userLongitude: location?.longitude,
        userLocation: location ? `${location.latitude}, ${location.longitude}` : 'Unknown'
      });
      alert('Query submitted successfully! Nearby hospitals will be notified.');
      router.push('/patient/dashboard');
    } catch (error) {
      console.error('Error submitting query:', error);
      alert('Failed to submit query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Locate Hospital"
        description="Find nearby hospitals for bed availability and doctor consultations"
      />

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Locate Hospital</h1>
            <p className="mt-2 text-gray-600">
              Find nearby hospitals for bed availability and emergency services
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Submit Query</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Query Type</label>
                <select
                  value={formData.queryType}
                  onChange={(e) => setFormData({ ...formData, queryType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="bed_availability">Bed Availability</option>
                  <option value="doctor_availability">Doctor Availability</option>
                  <option value="emergency">Emergency</option>
                  <option value="general">General Query</option>
                </select>
              </div>

              {formData.queryType === 'bed_availability' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bed Type</label>
                  <select
                    value={formData.bedType}
                    onChange={(e) => setFormData({ ...formData, bedType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="any">Any</option>
                    <option value="general">General Ward</option>
                    <option value="icu">ICU</option>
                  </select>
                </div>
              )}

              {formData.queryType === 'doctor_availability' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g., Cardiologist, Neurologist"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Provide additional details about your query"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Location section — must grant before hospitals show */}
              {!location ? (
                <button
                  type="button"
                  onClick={getUserLocation}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2 px-4 rounded-md hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-60"
                >
                  {locating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Detecting location...
                    </>
                  ) : (
                    <>📍 Enable location to find nearby hospitals</>
                  )}
                </button>
              ) : (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    📍 Location detected. Hospitals within {hospitalRadius || 10}km will be notified.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Query'}
              </button>
            </form>
          </div>

          {/* Hospitals only shown after location is granted */}
          {location && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Nearby Hospitals ({hospitals.length})
                {hospitalRadius && (
                  <span className="text-sm font-normal text-gray-500 ml-2">within {hospitalRadius}km</span>
                )}
              </h2>

              {hospitals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hospitals found within 10km.
                </p>
              ) : (
                <div className="space-y-4">
                  {hospitals.map((hospital) => (
                    <div key={hospital._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{hospital.hospitalName}</h3>
                          <p className="text-sm text-gray-600">{hospital.address}, {hospital.city}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            📞 {hospital.contactNumber}
                            {hospital.emergencyNumber && ` | 🚨 ${hospital.emergencyNumber}`}
                          </p>
                        </div>
                        {hospital.distance && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded whitespace-nowrap">
                            {hospital.distance} km
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-green-50 p-2 rounded">
                          <span className="text-gray-600">Available Beds:</span>
                          <span className="font-semibold ml-1">{hospital.availableBeds}/{hospital.totalBeds}</span>
                        </div>
                        <div className="bg-red-50 p-2 rounded">
                          <span className="text-gray-600">ICU Beds:</span>
                          <span className="font-semibold ml-1">{hospital.availableIcuBeds}/{hospital.icuBeds}</span>
                        </div>
                      </div>

                      {hospital.specializations?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Specializations:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {hospital.specializations.map((spec, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">{spec}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
