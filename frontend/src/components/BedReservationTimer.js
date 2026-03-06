import { useState, useEffect } from 'react';

export default function BedReservationTimer({ 
  reservationExpiresAt, 
  bookingId, 
  isHospital, 
  onExpired,
  patientArrivalStatus,
  status 
}) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!reservationExpiresAt) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(reservationExpiresAt).getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeRemaining(null);
        if (onExpired) onExpired();
        return;
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ minutes, seconds });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [reservationExpiresAt, onExpired]);

  // Don't show timer if booking is cancelled, completed, or patient arrival already marked
  if (status === 'cancelled' || status === 'completed' || patientArrivalStatus !== 'pending') {
    return null;
  }

  if (isExpired) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mt-2">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Reservation Time Expired</p>
            <p className="text-xs text-red-600">90-minute reservation window has passed</p>
          </div>
        </div>
      </div>
    );
  }

  if (!timeRemaining) return null;

  const isUrgent = timeRemaining.minutes < 30; // Less than 30 minutes
  const isWarning = timeRemaining.minutes < 60 && !isUrgent; // 30-60 minutes

  return (
    <div className={`border-2 rounded-lg p-3 mt-2 ${
      isUrgent ? 'bg-red-50 border-red-300' :
      isWarning ? 'bg-yellow-50 border-yellow-300' :
      'bg-blue-50 border-blue-300'
    }`}>
      <div className="flex items-center space-x-2">
        <svg className={`w-5 h-5 ${
          isUrgent ? 'text-red-600 animate-pulse' :
          isWarning ? 'text-yellow-600' :
          'text-blue-600'
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${
            isUrgent ? 'text-red-800' :
            isWarning ? 'text-yellow-800' :
            'text-blue-800'
          }`}>
            {isHospital ? 'Bed Reserved For' : 'Reservation Expires In'}
          </p>
          <div className="flex items-center space-x-2">
            <span className={`text-2xl font-bold ${
              isUrgent ? 'text-red-600' :
              isWarning ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              {String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
            </span>
            <span className={`text-xs ${
              isUrgent ? 'text-red-600' :
              isWarning ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              minutes remaining
            </span>
          </div>
        </div>
      </div>
      {isUrgent && (
        <div className="mt-2 pt-2 border-t border-red-200">
          <p className="text-xs text-red-700 font-medium">
            ⚠️ {isHospital ? 'Patient should arrive soon!' : 'Please arrive at the hospital soon!'}
          </p>
        </div>
      )}
    </div>
  );
}
