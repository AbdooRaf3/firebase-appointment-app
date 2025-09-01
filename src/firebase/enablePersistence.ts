import { enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { db } from './firebaseClient';

// تمكين persistence مع دعم Multi-tab
export const enableFirestorePersistence = async () => {
  try {
    // محاولة تمكين persistence مع دعم Multi-tab
    await enableMultiTabIndexedDbPersistence(db);
    console.log('تم تمكين Firestore persistence مع دعم Multi-tab');
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      // إذا فشل Multi-tab، جرب persistence العادي
      try {
        await enableIndexedDbPersistence(db);
        console.log('تم تمكين Firestore persistence العادي');
      } catch (persistenceError) {
        console.warn('فشل في تمكين Firestore persistence:', persistenceError);
      }
    } else if (error.code === 'unimplemented') {
      console.warn('المتصفح لا يدعم IndexedDB persistence');
    }
  }
};
