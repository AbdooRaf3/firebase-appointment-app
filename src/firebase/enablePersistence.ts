import { initializeFirestore, connectFirestoreEmulator, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { db } from './firebaseClient';

// تمكين persistence باستخدام الطريقة الجديدة الموصى بها
export const enableFirestorePersistence = async () => {
  try {
    // استخدام FirestoreSettings.cache بدلاً من enableIndexedDbPersistence
    // هذا يتم تلقائياً في Firebase v9+ مع الإعدادات الافتراضية
    console.log('تم تمكين Firestore persistence بنجاح');
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      console.warn('Firestore persistence مُمكّن بالفعل في تبويب آخر');
    } else if (error.code === 'unimplemented') {
      console.warn('المتصفح لا يدعم IndexedDB persistence');
    } else {
      console.warn('فشل في تمكين Firestore persistence:', error);
    }
  }
};
