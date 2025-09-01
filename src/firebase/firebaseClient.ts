import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تهيئة الخدمات
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// تهيئة Messaging (اختياري)
export let messaging: any = null;

// التحقق من دعم Messaging
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

// ربط Emulators في بيئة التطوير فقط
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  // ربط Auth Emulator
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    console.log('Auth Emulator already connected');
  }

  // ربط Firestore Emulator
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.log('Firestore Emulator already connected');
  }

  // ربط Storage Emulator
  try {
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (error) {
    console.log('Storage Emulator already connected');
  }
}

export default app;
