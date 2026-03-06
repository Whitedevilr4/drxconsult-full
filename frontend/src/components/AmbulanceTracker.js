import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// Custom icon creation helper
const createCustomIcon = (color, icon, label) => {
  if (typeof window === 'undefined') return null;
  
  const L = require('leaflet');
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; text-align: center;">
        <div style="
          background: ${color};
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 20px;
            display: block;
          ">${icon}</span>
        </div>
        <div style="
          position: absolute;
          top: 45px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 4px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          white-space: nowrap;
          font-size: 12px;
          font-weight: 600;
          color: #333;
          border: 1px solid ${color};
        ">${label}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

export default function AmbulanceTracker({ booking, onClose }) {
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customIcons, setCustomIcons] = useState(null);
  const mapRef = useRef(null);

  // Initialize custom icons
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setCustomIcons({
      hospital: createCustomIcon('#10B981', '🏥', 'Hospital'),
      ambulance: createCustomIcon('#F97316', '🚑', 'Ambulance'),
      home: createCustomIcon('#3B82F6', '🏠', 'Pickup Location')
    });
  }, []);

  // Simulated ambulance location (in production, this would come from GPS tracking)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Import leaflet CSS
    import('leaflet/dist/leaflet.css');

    // Get pickup location coordinates
    const pickupLat = booking.ambulanceDetails?.pickupLatitude || 28.6139; // Default to Delhi
    const pickupLng = booking.ambulanceDetails?.pickupLongitude || 77.2090;

    // Simulate ambulance starting from hospital and moving towards pickup
    // In production, this would be real GPS data from the ambulance
    const hospitalLat = pickupLat + 0.05; // Simulate hospital 5km away
    const hospitalLng = pickupLng + 0.05;

    // Simulate ambulance movement
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.02; // Move 2% closer each second
      if (progress >= 1) {
        progress = 1;
        clearInterval(interval);
      }

      const currentLat = hospitalLat + (pickupLat - hospitalLat) * progress;
      const currentLng = hospitalLng + (pickupLng - hospitalLng) * progress;

      setAmbulanceLocation({
        lat: currentLat,
        lng: currentLng,
        progress: Math.round(progress * 100),
        eta: Math.round((1 - progress) * 15), // Estimated time in minutes
      });
      setIsLoading(false);
    }, 1000);

    return () => clearInterval(interval);
  }, [booking]);

  if (typeof window === 'undefined') {
    return null; // Don't render on server
  }

  const pickupLat = booking.ambulanceDetails?.pickupLatitude || 28.6139;
  const pickupLng = booking.ambulanceDetails?.pickupLongitude || 77.2090;
  const hospitalLat = pickupLat + 0.05;
  const hospitalLng = pickupLng + 0.05;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h2 className="text-xl font-bold">Track Ambulance</h2>
              <p className="text-sm text-orange-100">{booking.ambulanceDetails?.ambulanceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Bar */}
        {ambulanceLocation && (
          <div className="bg-orange-50 px-6 py-4 border-b border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">En Route</span>
                </div>
                <div className="text-sm text-gray-600">
                  Progress: <span className="font-semibold text-orange-600">{ambulanceLocation.progress}%</span>
                </div>
                <div className="text-sm text-gray-600">
                  ETA: <span className="font-semibold text-orange-600">{ambulanceLocation.eta} min</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Driver: <span className="font-semibold">{booking.ambulanceDetails?.driverName}</span>
              </div>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className="relative" style={{ height: '500px' }}>
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center text-red-600">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>{error}</p>
              </div>
            </div>
          ) : ambulanceLocation && customIcons && (
            <MapContainer
              center={[ambulanceLocation.lat, ambulanceLocation.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Ambulance Marker with Custom Icon */}
              <Marker 
                position={[ambulanceLocation.lat, ambulanceLocation.lng]}
                icon={customIcons.ambulance}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold text-orange-600 text-lg">🚑 Ambulance</p>
                    <p className="text-sm font-medium">{booking.ambulanceDetails?.ambulanceNumber}</p>
                    <p className="text-xs text-gray-600 mt-1">Driver: {booking.ambulanceDetails?.driverName}</p>
                    <p className="text-xs text-gray-600">Contact: {booking.ambulanceDetails?.driverContact}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-sm font-semibold text-orange-600">ETA: {ambulanceLocation.eta} min</p>
                      <p className="text-xs text-gray-500">Progress: {ambulanceLocation.progress}%</p>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Pickup Location Marker with Custom Icon */}
              <Marker 
                position={[pickupLat, pickupLng]}
                icon={customIcons.home}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold text-blue-600 text-lg">🏠 Pickup Location</p>
                    <p className="text-sm font-medium mt-1">{booking.ambulanceDetails?.pickupLocation}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">Patient: {booking.ambulanceDetails?.patientName}</p>
                      <p className="text-xs text-gray-600">Age: {booking.ambulanceDetails?.patientAge}</p>
                      <p className="text-xs text-gray-600">Emergency: {booking.ambulanceDetails?.emergencyContact}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Hospital Marker with Custom Icon */}
              <Marker 
                position={[hospitalLat, hospitalLng]}
                icon={customIcons.hospital}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold text-green-600 text-lg">🏥 Hospital</p>
                    <p className="text-sm font-medium mt-1">{booking.hospitalId?.hospitalName}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">Contact: {booking.hospitalId?.contactNumber}</p>
                      <p className="text-xs text-gray-600 mt-1">{booking.hospitalId?.address}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Route Line */}
              <Polyline
                positions={[
                  [hospitalLat, hospitalLng],
                  [ambulanceLocation.lat, ambulanceLocation.lng],
                  [pickupLat, pickupLng]
                ]}
                color="orange"
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
              />
            </MapContainer>
          )}
        </div>

        {/* Details Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Patient</p>
              <p className="font-semibold">{booking.ambulanceDetails?.patientName}</p>
            </div>
            <div>
              <p className="text-gray-600">Contact</p>
              <p className="font-semibold">{booking.ambulanceDetails?.driverContact}</p>
            </div>
            <div>
              <p className="text-gray-600">Ambulance Type</p>
              <p className="font-semibold capitalize">{booking.ambulanceDetails?.ambulanceType?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-600">Emergency Contact</p>
              <p className="font-semibold">{booking.ambulanceDetails?.emergencyContact}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
