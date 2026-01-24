import { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { toast } from 'react-toastify';
import axios from 'axios';

export const useFirebaseAuth = () => {
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    // Check if Firebase is configured before attempting sign-in
    const isFirebaseConfigured = 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your_firebase_api_key_here';

    if (!isFirebaseConfigured) {
      const errorMessage = 'Google Sign-In is not available. Please use email/password authentication.';
      toast.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
        firebaseNotConfigured: true
      };
    }

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Get the ID token
      const idToken = await user.getIdToken();
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        },
        idToken
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      let errorMessage = 'Failed to sign in with Google';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in cancelled by user';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup blocked by browser. Please allow popups and try again.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        default:
          errorMessage = error.message || 'Failed to sign in with Google';
      }
      
      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
      return { success: false, error: error.message };
    }
  };

  const authenticateWithBackend = async (idToken, userData, isSignup = false) => {
    try {
      const endpoint = isSignup ? '/auth/firebase-signup' : '/auth/firebase-login';
      
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        idToken,
        userData
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Backend authentication error:', error);
      
      let errorMessage = 'Authentication failed';
      
      if (error.response?.data?.firebaseNotConfigured) {
        errorMessage = 'Google Sign-In is not available. Please use email/password authentication.';
      } else {
        errorMessage = error.response?.data?.message || 'Authentication failed';
      }
      
      return {
        success: false,
        error: errorMessage,
        firebaseNotConfigured: error.response?.data?.firebaseNotConfigured
      };
    }
  };

  return {
    signInWithGoogle,
    signOutUser,
    authenticateWithBackend,
    loading
  };
};