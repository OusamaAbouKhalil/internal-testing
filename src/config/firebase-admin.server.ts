import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK configuration for server-side operations
 * Automatically connects to emulator in development or live Firebase in production
 */

// Ensure this module only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('firebase-admin can only be imported in server-side code');
}

// Track if settings have been applied
let settingsApplied = false;
let _adminApp: ReturnType<typeof initializeApp> | null = null;
let _adminDb: Firestore | null = null;

// Initialize Firebase Admin (singleton pattern)
function initializeFirebaseAdmin() {
  if (_adminApp) {
    return _adminApp;
  }

  const apps = getApps();
  
  if (apps.length > 0) {
    _adminApp = apps[0];
    return _adminApp;
  }

  // Check if explicitly using emulator (must have both flag and emulator host)
  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && 
                      process.env.FIRESTORE_EMULATOR_HOST;
  
  if (useEmulator) {
    console.log('🔧 Initializing Firebase Admin for EMULATOR');
    
    _adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oureasygame-internal-testing',
    });
    return _adminApp;
  }

  // In production, use service account credentials
  console.log('🔧 Initializing Firebase Admin for PRODUCTION');
  console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  
  // Check if we have service account credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    _adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oureasygame-internal-testing',
    });
    return _adminApp;
  }
  
  // Fallback: Initialize without credentials (will use Application Default Credentials)
  _adminApp = initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oureasygame-internal-testing',
  });
  return _adminApp;
}

// Get Firestore instance
function getFirestoreInstance(): Firestore {
  if (_adminDb) {
    return _adminDb;
  }

  const app = initializeFirebaseAdmin();
  _adminDb = getFirestore(app);

  // Connect to Firestore emulator if in development (only once)
  // Only connect if explicitly running with emulator AND emulator host is set
  if (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && 
    process.env.FIRESTORE_EMULATOR_HOST &&
    !settingsApplied
  ) {
    const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
    const [host, port] = firestoreHost.split(':');
    
    console.log(`📡 Connecting to Firestore Emulator at ${host}:${port}`);
    console.log('firestoreHost', firestoreHost);
    try {
      _adminDb.settings({
        host: firestoreHost,
        ssl: false,
      });
      settingsApplied = true;
    } catch (error) {
      // Settings already applied, ignore
      console.log('⚠️  Firestore settings already configured');
    }
  } else {
    console.log('🌐 Using production Firestore (not emulator)');
  }

  return _adminDb;
}

export const adminDb = getFirestoreInstance();
export default initializeFirebaseAdmin();

