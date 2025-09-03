import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBgobPK7uwaAcGEUxBpi7WY7sAIDlIt5sQ",
  authDomain: "mayor-plan.firebaseapp.com",
  projectId: "mayor-plan",
  storageBucket: "mayor-plan.appspot.com",
  messagingSenderId: "604154242666",
  appId: "1:604154242666:web:a109449fae6dd1bd908c13",
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تهيئة الخدمات
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// تهيئة Messaging
export let messaging: any = null;

// التحقق من دعم Messaging وتهيئته
const initMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      console.log('Firebase Messaging initialized successfully');
    } else {
      console.log('Firebase Messaging is not supported in this browser');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
  }
};

// تهيئة Messaging
initMessaging();

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
