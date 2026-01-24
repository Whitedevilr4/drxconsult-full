import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

export default function GoogleSignInButton({ 
  onSuccess, 
  onError, 
  isSignup = false, 
  disabled = false,
  className = "" 
}) {
  const { signInWithGoogle, authenticateWithBackend, loading } = useFirebaseAuth();

  const handleGoogleSignIn = async () => {
    // Check if Firebase is configured
    const isFirebaseConfigured = 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your_firebase_api_key_here';

    if (!isFirebaseConfigured) {
      onError('Google Sign-In is not configured. Please use email/password authentication.');
      return;
    }

    const result = await signInWithGoogle();
    
    if (result.success) {
      // Authenticate with backend
      const backendResult = await authenticateWithBackend(
        result.idToken, 
        result.user, 
        isSignup
      );
      
      if (backendResult.success) {
        onSuccess(backendResult.data, result.user);
      } else {
        onError(backendResult.error);
      }
    } else {
      onError(result.error);
    }
  };

  // Check if Firebase is configured
  const isFirebaseConfigured = 
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your_firebase_api_key_here';

  // Don't render the button if Firebase is not configured
  if (!isFirebaseConfigured) {
    return (
      <div className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md text-center text-sm text-gray-600">
        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        Google Sign-In not configured
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled || loading}
      className={`w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {loading ? (
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Signing in...
        </div>
      ) : (
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {isSignup ? 'Sign up with Google' : 'Sign in with Google'}
        </div>
      )}
    </button>
  );
}