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
  pushNotificationsEnabled: boolean; // حالة تفعيل الإشعارات
  unsubscribe: (() => void) | null; // دالة إلغاء الاشتراك
  
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
  
  // إلغاء الاشتراك من الإشعارات
  unsubscribeFromNotifications: () => void;
  
  // إعداد إشعارات المتصفح
  setupPushNotifications: () => Promise<void>;
  
  // فحص حالة الإشعارات
  checkNotificationPermission: () => Promise<boolean>;
  
  // اختبار الإشعارات
  testNotification: () => void;
  
  // إرسال إشعار للهاتف (مجاني)
  sendPhoneNotification: (title: string, body: string) => Promise<void>;
  
  // تنظيف
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  pushNotificationsEnabled: false, // حالة تفعيل الإشعارات
  unsubscribe: null, // دالة إلغاء الاشتراك

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
    // إلغاء الاشتراك السابق إذا كان موجوداً
    const currentUnsubscribe = get().unsubscribe;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }
    
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
        console.log('إجمالي الإشعارات المحملة:', notificationsData.length);
        
        set({
          notifications: notificationsData,
          unreadCount,
          isLoading: false
        });
      }, (error) => {
        console.error('فشل في تحميل الإشعارات:', error);
        set({ error: error.message, isLoading: false });
      });

      // حفظ دالة إلغاء الاشتراك
      set({ unsubscribe });
    } catch (error: any) {
      console.error('فشل في إعداد مراقب الإشعارات:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  unsubscribeFromNotifications: () => {
    const currentUnsubscribe = get().unsubscribe;
    if (currentUnsubscribe) {
      currentUnsubscribe();
      set({ unsubscribe: null });
    }
  },

  checkNotificationPermission: async () => {
    try {
      // فحص إذن الإشعارات
      if (!('Notification' in window)) {
        console.log('المتصفح لا يدعم الإشعارات');
        return false;
      }

      const permission = Notification.permission;
      console.log('حالة إذن الإشعارات:', permission);
      
      if (permission === 'granted') {
        set({ pushNotificationsEnabled: true });
        return true;
      } else if (permission === 'default') {
        // طلب الإذن
        const newPermission = await Notification.requestPermission();
        if (newPermission === 'granted') {
          set({ pushNotificationsEnabled: true });
          return true;
        }
      }
      
      set({ pushNotificationsEnabled: false });
      return false;
    } catch (error: any) {
      console.error('فشل في فحص إذن الإشعارات:', error);
      return false;
    }
  },

  setupPushNotifications: async () => {
    try {
      // فحص إذن الإشعارات أولاً
      const hasPermission = await get().checkNotificationPermission();
      if (!hasPermission) {
        console.log('لم يتم منح إذن الإشعارات');
        return;
      }

      // التحقق من دعم Service Worker
      if (!('serviceWorker' in navigator)) {
        console.log('المتصفح لا يدعم Service Worker');
        return;
      }

      // التحقق من تسجيل Service Worker
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker ready:', registration);

      // طلب إذن الإشعارات
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('تم رفض إذن الإشعارات');
        return;
      }

             // الحصول على توكن الإشعارات
       const messaging = getMessaging();
       const token = await getToken(messaging, {
         vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
         serviceWorkerRegistration: registration
       });

      if (token) {
        console.log('تم الحصول على توكن الإشعارات:', token);
        
        // حفظ التوكن في Firestore
        const auth = getAuth();
        if (auth.currentUser) {
          await addDoc(collection(db, 'deviceTokens'), {
            uid: auth.currentUser.uid,
            token: token,
            createdAt: serverTimestamp()
          });
          console.log('تم حفظ توكن الإشعارات في Firestore');
        }
      }

             // الاستماع للإشعارات الواردة (عندما يكون التطبيق مفتوح)
       onMessage(messaging, async (payload) => {
         console.log('تم استلام إشعار (التطبيق مفتوح):', payload);
         
         // عرض الإشعار في المتصفح عبر SW ليظهر على شاشة القفل
         if (payload.notification) {
           const swReg = await navigator.serviceWorker.ready;
           await swReg.showNotification(payload.notification.title || 'إشعار جديد', {
             body: payload.notification.body,
             icon: '/icon-192x192.png',
             badge: '/icon-192x192.png',
             tag: 'appointment-notification',
             data: payload.data || {},
             requireInteraction: true
           });
         }
       });

      // تحديث حالة الإشعارات
      set({ pushNotificationsEnabled: true });
      console.log('تم تفعيل إشعارات المتصفح بنجاح');

    } catch (error: any) {
      console.error('فشل في إعداد إشعارات المتصفح:', error);
      set({ error: error.message, pushNotificationsEnabled: false });
    }
  },

  testNotification: async () => {
    try {
      // التحقق من Service Worker
      if (!('serviceWorker' in navigator)) {
        console.log('المتصفح لا يدعم Service Worker');
        return;
      }

      // التحقق من إذن الإشعارات
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('الإشعارات غير مفعلة');
        return;
      }

      // الحصول على تسجيل Service Worker
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker registration:', registration);

             // إرسال إشعار تجريبي
       await registration.showNotification('اختبار الإشعارات', {
         body: 'هذا إشعار تجريبي للتأكد من عمل الإشعارات',
         icon: '/icon-192x192.png',
         badge: '/icon-192x192.png',
         tag: 'test-notification',
         requireInteraction: true
       });

      console.log('تم إرسال إشعار تجريبي عبر Service Worker');

    } catch (error: any) {
      console.error('فشل في إرسال إشعار تجريبي:', error);
      
      // محاولة إرسال إشعار عادي كحل بديل
      try {
        new Notification('اختبار الإشعارات', {
          body: 'هذا إشعار تجريبي للتأكد من عمل الإشعارات',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'test-notification',
          requireInteraction: true
        });
        console.log('تم إرسال إشعار تجريبي عادي');
      } catch (fallbackError) {
        console.error('فشل في إرسال إشعار بديل:', fallbackError);
      }
    }
  },

  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      error: null
    });
  },

  sendPhoneNotification: async (title: string, body: string) => {
    try {
      // التحقق من Service Worker
      if (!('serviceWorker' in navigator)) {
        console.log('المتصفح لا يدعم Service Worker');
        return;
      }

      // الحصول على تسجيل Service Worker
      const registration = await navigator.serviceWorker.ready;
      
      // إرسال رسالة إلى Service Worker لعرض الإشعار
      registration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: title,
        body: body,
        icon: '/icon-192x192.png',
        tag: 'phone-notification'
      });

      console.log('تم إرسال إشعار للهاتف');
    } catch (error: any) {
      console.error('فشل في إرسال إشعار للهاتف:', error);
    }
  }
}));
