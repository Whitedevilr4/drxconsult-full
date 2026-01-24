const admin = require('firebase-admin');

let firebaseInitialized = false;

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    firebaseInitialized = true;
    return true;
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Use service account key from environment variable
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } catch (jsonError) {
        console.error('❌ Firebase service account key is not valid JSON:', jsonError.message);
        console.warn('   Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is a single-line JSON string.');
        firebaseInitialized = false;
        return false;
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      
      firebaseInitialized = true;
      
      return true;
      
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account key file path
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      
      firebaseInitialized = true;
      
      return true;
      
    } else {
      console.warn('⚠️  Firebase Admin SDK not properly configured. Please add Firebase service account credentials.');
      console.warn('   Add FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS to your environment variables.');
      firebaseInitialized = false;
      return false;
    }
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization error:', error.message);
    firebaseInitialized = false;
    return false;
  }
};

// Initialize Firebase on module load
initializeFirebase();

// Helper function to check if Firebase is properly initialized
const isFirebaseInitialized = () => {
  return firebaseInitialized && admin.apps.length > 0;
};

// Safe Firebase auth getter
const getFirebaseAuth = () => {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase Admin SDK not properly configured. Please add Firebase service account credentials.');
  }
  return admin.auth();
};

module.exports = {
  admin,
  isFirebaseInitialized,
  getFirebaseAuth,
  initializeFirebase
};