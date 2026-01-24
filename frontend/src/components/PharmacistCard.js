import Link from 'next/link'

export default function PharmacistCard({ pharmacist }) {
  const defaultPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(pharmacist.userId?.name || 'Pharmacist')}&size=200&background=3498db&color=fff&bold=true`
  
  // Calculate rating and sessions from pharmacist data
  const averageRating = pharmacist.averageRating || 0
  const totalReviews = pharmacist.totalReviews || 0
  const completedSessions = pharmacist.completedSessions || pharmacist.totalPatientsCounselled || 0
  
  // Render star rating
  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20">
            <defs>
              <linearGradient id={`half-${pharmacist._id}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#e5e7eb" />
              </linearGradient>
            </defs>
            <path fill={`url(#half-${pharmacist._id})`} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      } else {
        stars.push(
          <svg key={i} className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      }
    }
    return stars
  }
  
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-24 sm:h-32 relative">
        <div className="absolute -bottom-8 sm:-bottom-12 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            <img 
              src={pharmacist.photo || defaultPhoto} 
              alt={pharmacist.userId?.name}
              className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg"
              onError={(e) => { e.target.src = defaultPhoto }}
            />
            {/* Status indicator - green for online, gray for offline */}
            <div className={`absolute bottom-0 right-0 w-4 h-4 sm:w-6 sm:h-6 rounded-full border-2 border-white ${
              pharmacist.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-12 sm:pt-16 pb-4 sm:pb-6 px-4 sm:px-6 text-center">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">
          {pharmacist.userId?.name}
        </h3>
        <p className="text-blue-600 font-medium text-xs sm:text-sm mb-2">
          {pharmacist.designation}
        </p>
        {pharmacist.description && (
          <p className="text-gray-600 text-xs mb-3 line-clamp-2">
            {pharmacist.description}
          </p>
        )}

        {/* Stats */}
        <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
          {/* Rating */}
          {averageRating > 0 && (
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <div className="flex items-center space-x-1">
                {renderStars(averageRating)}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-gray-700">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">
                ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
          
          {/* Completed Sessions */}
          <div className="flex items-center justify-center bg-gray-50 px-3 sm:px-4 py-2 rounded-lg">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs sm:text-sm font-semibold text-gray-700">
              {completedSessions} {completedSessions === 1 ? 'Session' : 'Sessions'} Completed
            </span>
          </div>
        </div>

        {/* Status and badges */}
        <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mb-3 sm:mb-4">
          {/* Online/Offline Status Badge */}
          <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-medium ${
            pharmacist.status === 'online' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {pharmacist.status === 'online' ? '🟢 Online' : '⚫ Offline'}
          </span>
          <span className="bg-blue-50 text-blue-700 text-xs px-2 sm:px-3 py-1 rounded-full font-medium">
            💊 Expert
          </span>
          <span className="bg-green-50 text-green-700 text-xs px-2 sm:px-3 py-1 rounded-full font-medium">
            ✓ Verified
          </span>
        </div>

        {/* Book button */}
        {pharmacist.status === 'online' ? (
          <Link 
            href={`/book/${pharmacist._id}`}
            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg text-sm sm:text-base"
          >
            Book Appointment
          </Link>
        ) : (
          <button
            disabled
            className="block w-full bg-gray-400 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg cursor-not-allowed text-sm sm:text-base"
          >
            Currently Offline
          </button>
        )}

        {/* Additional info */}
        <p className="text-xs text-gray-500 mt-2 sm:mt-3">
          {pharmacist.status === 'online' ? 'Available for online consultation' : 'Not available at the moment'}
        </p>
      </div>
    </div>
  )
}
