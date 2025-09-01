import { enableIndexedDbPersistence } from 'firebase/firestore';
import { db } from './firebaseClient';

// تمكين persistence باستخدام الطريقة الموصى بها
export const enableFirestorePersistence = async () => {
  try {
    // استخدام الطريقة الموصى بها
    await enableIndexedDbPersistence(db);
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
