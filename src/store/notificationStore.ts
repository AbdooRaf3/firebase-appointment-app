import { create } from 'zustand';
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment_created' | 'appointment_reminder' | 'status_changed' | 'general';
  appointmentId?: string;
  isRead: boolean;
  createdAt: any;
  scheduledFor?: any; // للتنبيهات المجدولة
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // إرسال إشعار
  sendNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  
  // إرسال تنبيه مجدول
  scheduleNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>, scheduledFor: Date) => Promise<void>;
  
  // تحديث حالة القراءة
  markAsRead: (notificationId: string) => Promise<void>;
  
  // حذف إشعار
  deleteNotification: (notificationId: string) => Promise<void>;
  
  // تحميل الإشعارات
  loadNotifications: (userId: string) => void;
  
  // إعداد إشعارات المتصفح
  setupPushNotifications: () => Promise<void>;
  
  // تنظيف
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  sendNotification: async (notification) => {
    try {
      console.log('إرسال إشعار:', notification);
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notification,
        isRead: false,
        createdAt: serverTimestamp()
      });
      console.log('تم إرسال الإشعار بنجاح:', docRef.id);
    } catch (error: any) {
      console.error('فشل في إرسال الإشعار:', error);
      set({ error: error.message });
    }
  },

  scheduleNotification: async (notification, scheduledFor) => {
    try {
      await addDoc(collection(db, 'scheduledNotifications'), {
        ...notification,
        isRead: false,
        createdAt: serverTimestamp(),
        scheduledFor: scheduledFor,
        isSent: false
      });
    } catch (error: any) {
      console.error('فشل في جدولة الإشعار:', error);
      set({ error: error.message });
    }
  },

  markAsRead: async (notificationId) => {
    try {
      // تحديث في Firestore
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { isRead: true });
      
      // تحديث في المتجر المحلي
      set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (error: any) {
      console.error('فشل في تحديث حالة القراءة:', error);
      set({ error: error.message });
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      // حذف من Firestore
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
      
      // حذف من المتجر المحلي
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== notificationId),
        unreadCount: state.notifications.filter(n => n.id !== notificationId && !n.isRead).length
      }));
    } catch (error: any) {
      console.error('فشل في حذف الإشعار:', error);
      set({ error: error.message });
    }
  },

  loadNotifications: (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('تم استلام إشعارات:', snapshot.size);
        const notificationsData: Notification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('إشعار:', data);
          notificationsData.push({
            id: doc.id,
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type,
            appointmentId: data.appointmentId,
            isRead: data.isRead,
            createdAt: data.createdAt?.toDate(),
            scheduledFor: data.scheduledFor?.toDate()
          });
        });

        const unreadCount = notificationsData.filter(n => !n.isRead).length;
        console.log('عدد الإشعارات غير المقروءة:', unreadCount);
        
        set({
          notifications: notificationsData,
          unreadCount,
          isLoading: false
        });
      }, (error) => {
        console.error('فشل في تحميل الإشعارات:', error);
        set({ error: error.message, isLoading: false });
      });

      // إرجاع دالة إلغاء الاشتراك
      return unsubscribe;
    } catch (error: any) {
      console.error('فشل في إعداد مراقب الإشعارات:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  setupPushNotifications: async () => {
    try {
      const messaging = getMessaging();
      
      // طلب إذن الإشعارات
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('تم رفض إذن الإشعارات');
        return;
      }

      // الحصول على توكن الإشعارات
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY' // يجب استبدالها بمفتاح VAPID الخاص بك
      });

      if (token) {
        // حفظ التوكن في Firestore
        const auth = getAuth();
        if (auth.currentUser) {
          await addDoc(collection(db, 'deviceTokens'), {
            uid: auth.currentUser.uid,
            token: token,
            createdAt: serverTimestamp()
          });
        }
      }

      // الاستماع للإشعارات الواردة
      onMessage(messaging, (payload) => {
        console.log('تم استلام إشعار:', payload);
        
        // عرض الإشعار في المتصفح
        if (payload.notification) {
          new Notification(payload.notification.title || 'إشعار جديد', {
            body: payload.notification.body,
            icon: '/icons/icon-192x192.png'
          });
        }
      });

    } catch (error: any) {
      console.error('فشل في إعداد إشعارات المتصفح:', error);
      set({ error: error.message });
    }
  },

  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      error: null
    });
  }
}));
