import { create } from 'zustand';
import { NotificationState } from '../types';
import { messaging } from '../firebase/firebaseClient';
import { getToken, deleteToken } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';

interface NotificationStore extends NotificationState {
  requestPermission: () => Promise<void>;
  getToken: () => Promise<void>;
  saveToken: (uid: string) => Promise<void>;
  deleteToken: (uid: string) => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  enabled: false,
  token: null,
  loading: false,
  error: null,

  requestPermission: async () => {
    try {
      set({ loading: true, error: null });
      
      if (!messaging) {
        throw new Error('المتصفح لا يدعم الإشعارات');
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        set({ enabled: true });
        await get().getToken();
      } else if (permission === 'denied') {
        set({ enabled: false, error: 'تم رفض إذن الإشعارات' });
      } else {
        set({ enabled: false, error: 'لم يتم تحديد إذن الإشعارات' });
      }
    } catch (error: any) {
      set({ error: error.message || 'حدث خطأ في طلب إذن الإشعارات', loading: false });
    } finally {
      set({ loading: false });
    }
  },

  getToken: async () => {
    try {
      if (!messaging) {
        throw new Error('المتصفح لا يدعم الإشعارات');
      }

      const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
      if (!vapidKey) {
        throw new Error('مفتاح VAPID غير محدد');
      }

      const token = await getToken(messaging, { vapidKey });
      
      if (token) {
        set({ token });
      } else {
        throw new Error('فشل في الحصول على رمز الإشعارات');
      }
    } catch (error: any) {
      set({ error: error.message || 'حدث خطأ في الحصول على رمز الإشعارات' });
    }
  },

  saveToken: async (uid: string) => {
    try {
      const { token } = get();
      if (!token) {
        throw new Error('لا يوجد رمز إشعارات');
      }

      const tokenDoc = doc(db, 'deviceTokens', `${uid}_web`);
      await setDoc(tokenDoc, {
        uid,
        token,
        platform: 'web',
        createdAt: new Date()
      });

      console.log('تم حفظ رمز الإشعارات بنجاح');
    } catch (error: any) {
      set({ error: error.message || 'حدث خطأ في حفظ رمز الإشعارات' });
    }
  },

  deleteToken: async (uid: string) => {
    try {
      if (!messaging) {
        throw new Error('المتصفح لا يدعم الإشعارات');
      }

      // حذف الرمز من Firebase
      await deleteToken(messaging);
      
      // حذف الرمز من Firestore
      const tokenDoc = doc(db, 'deviceTokens', `${uid}_web`);
      await deleteDoc(tokenDoc);

      set({ token: null, enabled: false });
      console.log('تم حذف رمز الإشعارات بنجاح');
    } catch (error: any) {
      set({ error: error.message || 'حدث خطأ في حذف رمز الإشعارات' });
    }
  },

  setEnabled: (enabled: boolean) => set({ enabled }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error })
}));
