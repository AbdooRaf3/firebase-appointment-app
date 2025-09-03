import { create } from 'zustand';
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { getMessagingInstance } from '../firebase/firebaseClient';

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
  
  // الاستماع للإشعارات الفورية
  listenToImmediateNotifications: (userId: string) => void;
  
  // حفظ الإشعار للخلفية باستخدام Background Sync
  saveNotificationForBackground: (title: string, message: string, data: any) => Promise<void>;
  
  // إعداد إشعارات المتصفح
  setupPushNotifications: () => Promise<void>;
  
  // فحص حالة الإشعارات
  checkNotificationPermission: () => Promise<boolean>;
  
  // اختبار الإشعارات
  testNotification: () => void;

  // تشخيص مشاكل FCM
  diagnoseFCM: () => Promise<void>;
  
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
        orderBy('createdAt', 'desc'),
        // تقليل عدد الوثائق المقروءة للحفاظ على الخطة المجانية
        // عند الحاجة يمكن إضافة زر "تحميل المزيد"
        limit(20)
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

  // الاستماع للإشعارات الفورية
  listenToImmediateNotifications: (userId: string) => {
    try {
      const immediateNotificationsRef = collection(db, 'immediateNotifications');
      const q = query(
        immediateNotificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      return onSnapshot(q, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            console.log('إشعار فوري جديد:', data);
            
            // محاولة إرسال إشعار فوري
            try {
              await get().sendPhoneNotification(data.title, data.message);
            } catch (error) {
              console.log('فشل في إرسال إشعار فوري، سيتم حفظه للخلفية:', error);
              
              // حفظ الإشعار للخلفية باستخدام Background Sync
              await get().saveNotificationForBackground(data.title, data.message, data);
            }
            
            // حفظ الإشعار في قاعدة البيانات
            await get().sendNotification({
              userId: data.userId,
              title: data.title,
              message: data.message,
              type: data.type,
              appointmentId: data.appointmentId
            });
            
            // تحديث حالة الإشعار كمقروء
            await updateDoc(change.doc.ref, { read: true });
          }
        });
      });
    } catch (error: any) {
      console.error('فشل في الاستماع للإشعارات الفورية:', error);
    }
  },

  // حفظ الإشعار للخلفية باستخدام Background Sync
  saveNotificationForBackground: async (title: string, message: string, data: any) => {
    try {
      // التحقق من دعم Background Sync
      if ('serviceWorker' in navigator && 'sync' in (window.ServiceWorkerRegistration as any).prototype) {
        const registration = await navigator.serviceWorker.ready;
        
        // إرسال الإشعار إلى Service Worker لحفظه
        if (registration.active) {
          registration.active.postMessage({
            type: 'SAVE_PENDING_NOTIFICATION',
            notification: {
              title: title,
              message: message,
              data: data
            }
          });
          
          // تسجيل Background Sync
          await (registration as any).sync.register('send-notification');
          console.log('تم حفظ الإشعار للخلفية وتسجيل Background Sync');
        }
      } else {
        console.log('Background Sync غير مدعوم في هذا المتصفح');
      }
    } catch (error: any) {
      console.error('فشل في حفظ الإشعار للخلفية:', error);
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
      console.log('بدء إعداد إشعارات المتصفح...');
      
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

      console.log('محاولة الحصول على توكن Firebase Messaging...');
      
      // التحقق من أن messaging متاح مع انتظار التهيئة
      let messaging = getMessagingInstance();
      if (!messaging) {
        console.log('Firebase Messaging غير متاح - محاولة انتظار التهيئة...');
        // انتظار قصير لإعطاء وقت للتهيئة
        await new Promise(resolve => setTimeout(resolve, 1000));
        messaging = getMessagingInstance();
        if (!messaging) {
          console.log('Firebase Messaging لا يزال غير متاح');
          return;
        }
      }

      // التحقق من حالة المصادقة
      const auth = getAuth();
      if (!auth.currentUser) {
        console.log('المستخدم غير مسجل الدخول - سيتم تأجيل إعداد الإشعارات');
        return;
      }

      // التحقق من أن المستخدم لديه token صالح
      try {
        const idToken = await auth.currentUser.getIdToken(true); // إجبار تحديث التوكن
        console.log('تم التحقق من token المستخدم بنجاح');
      } catch (authError) {
        console.log('فشل في التحقق من token المستخدم:', authError);
        console.log('سيتم استخدام الإشعارات المحلية بدلاً من Firebase Messaging');
        return;
      }
      
      try {
        const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
        console.log('VAPID Key:', vapidKey ? 'موجود' : 'غير موجود');

        if (!vapidKey) {
          console.warn('تحذير: مفتاح VAPID غير محدد في متغيرات البيئة');
          console.log('سيتم استخدام المفتاح الافتراضي للاختبار');
        }

        // محاولة الحصول على التوكن بدون VAPID Key أولاً
        let token;
        try {
          token = await getToken(messaging, {
            serviceWorkerRegistration: registration
          });
        } catch (error) {
          console.log('فشل الحصول على التوكن بدون VAPID Key، جاري المحاولة مع VAPID Key...');
          token = await getToken(messaging, {
            vapidKey: vapidKey || 'BL99ulW-nqClj9yKYRrGy1BGQLq0BilmZKM8JfuDOUAfuaNCQ_d9tzDK3ubzxbcxKqQ4V09a-7t_EYBqZlj8Kqw',
            serviceWorkerRegistration: registration
          });
        }

        if (token) {
          console.log('تم الحصول على توكن Firebase Messaging بنجاح:', token.substring(0, 20) + '...');

          // حفظ التوكن في localStorage للاستخدام لاحقاً
          localStorage.setItem('fcm_token', token);
          console.log('تم حفظ توكن FCM في localStorage');

          // حفظ التوكن في Firestore للاستخدام من Cloud Functions
          try {
            const auth = getAuth();
            if (auth.currentUser) {
              await addDoc(collection(db, 'deviceTokens'), {
                uid: auth.currentUser.uid,
                token: token,
                createdAt: serverTimestamp(),
                platform: 'web',
                userAgent: navigator.userAgent
              });
              console.log('تم حفظ توكن FCM في Firestore');
            }
          } catch (tokenSaveError) {
            console.error('فشل في حفظ توكن FCM في Firestore:', tokenSaveError);
          }
        } else {
          console.warn('لم يتم الحصول على توكن Firebase Messaging - التوكن فارغ');
        }
      } catch (tokenError: any) {
        console.error('خطأ في الحصول على توكن Firebase Messaging:', tokenError);

        // تحليل نوع الخطأ لتقديم حلول محددة
        if (tokenError.code === 'messaging/failed-service-worker-registration') {
          console.error('خطأ في تسجيل Service Worker - تأكد من صحة ملف firebase-messaging-sw.js');
        } else if (tokenError.code === 'messaging/invalid-vapid-key') {
          console.error('مفتاح VAPID غير صحيح - تحقق من إعدادات Firebase Console');
        } else if (tokenError.code === 'messaging/missing-app-config') {
          console.error('إعدادات Firebase غير مكتملة - تحقق من firebaseClient.ts');
        } else if (tokenError.message && tokenError.message.includes('401')) {
          console.error('خطأ في المصادقة (401) - قد يكون مفتاح VAPID غير صحيح أو غير مفعل في Firebase Console');
          console.error('الحل:');
          console.error('1. اذهب إلى Firebase Console > Project Settings > Cloud Messaging');
          console.error('2. تأكد من وجود Web Push certificates');
          console.error('3. إذا لم يكن موجوداً، انقر على "Generate key pair"');
          console.error('4. تأكد من تفعيل Firebase Cloud Messaging API في Google Cloud Console');
          console.error('5. تحقق من أن المشروع يستخدم Firebase SDK v9+');
        } else {
          console.error('خطأ غير معروف:', tokenError.message);
        }

        console.log('سيتم استخدام الإشعارات المحلية بدلاً من Firebase Messaging');
      }

      // الاستماع للإشعارات الواردة (عندما يكون التطبيق مفتوح)
      if (messaging) {
        try {
          onMessage(messaging, async (payload) => {
          console.log('تم استلام إشعار (التطبيق مفتوح):', payload);
          
          // عرض الإشعار في المتصفح عبر SW ليظهر على شاشة القفل
          if (payload.notification) {
            const swReg = await navigator.serviceWorker.ready;
            await swReg.showNotification(payload.notification.title || 'إشعار جديد', {
              body: payload.notification.body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-192x192.png',
              tag: 'appointment-notification',
              data: payload.data || {},
              requireInteraction: true
            });
          }
          });
          console.log('تم إعداد الاستماع للإشعارات الواردة');
        } catch (onMessageError: any) {
          console.warn('فشل في إعداد الاستماع للإشعارات الواردة:', onMessageError.message);
        }
      }

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
      console.log('بدء إرسال إشعار للهاتف:', { title, body });

      // التحقق من Service Worker
      if (!('serviceWorker' in navigator)) {
        console.error('المتصفح لا يدعم Service Worker');
        return;
      }

      // التحقق من إذن الإشعارات
      if (!('Notification' in window)) {
        console.error('المتصفح لا يدعم الإشعارات');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.error('لم يتم منح إذن الإشعارات:', Notification.permission);
        return;
      }

      // الحصول على تسجيل Service Worker
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker registration:', registration);

      if (!registration.active) {
        console.error('Service Worker غير نشط');
        return;
      }

      // إرسال رسالة إلى Service Worker لعرض الإشعار - محسن للآيفون
      const notificationData = {
        type: 'SHOW_NOTIFICATION',
        title: title,
        body: body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'phone-notification',
        // إعدادات خاصة للآيفون
        requireInteraction: true,
        dir: 'rtl',
        lang: 'ar-SA',
        timestamp: Date.now(),
        vibrate: [200, 100, 200, 100, 200],
        actions: [
          {
            action: 'view',
            title: 'عرض',
            icon: '/icons/icon-192x192.png'
          },
          {
            action: 'dismiss',
            title: 'تجاهل',
            icon: '/icons/icon-192x192.png'
          }
        ]
      };

      console.log('إرسال بيانات الإشعار إلى Service Worker:', notificationData);
      registration.active.postMessage(notificationData);

      console.log('تم إرسال إشعار للهاتف بنجاح - محسن للآيفون');
    } catch (error: any) {
      console.error('فشل في إرسال إشعار للهاتف:', error);
    }
  },

  diagnoseFCM: async () => {
    console.log('🔍 بدء تشخيص مشاكل Firebase Cloud Messaging (FCM)...');

    // فحص 1: دعم المتصفح
    console.log('📋 فحص 1: دعم المتصفح');
    if (!('serviceWorker' in navigator)) {
      console.error('❌ Service Worker غير مدعوم في هذا المتصفح');
      return;
    } else {
      console.log('✅ Service Worker مدعوم');
    }

    if (!('Notification' in window)) {
      console.error('❌ الإشعارات غير مدعومة في هذا المتصفح');
      return;
    } else {
      console.log('✅ الإشعارات مدعومة');
    }

    if (!('PushManager' in window)) {
      console.error('❌ Push API غير مدعوم في هذا المتصفح');
      return;
    } else {
      console.log('✅ Push API مدعوم');
    }

    // فحص 2: حالة الإذن
    console.log('📋 فحص 2: حالة إذن الإشعارات');
    const permission = Notification.permission;
    console.log('حالة الإذن:', permission);

    if (permission === 'denied') {
      console.error('❌ تم رفض إذن الإشعارات - يجب على المستخدم السماح بالإشعارات يدوياً');
      return;
    }

    // فحص 3: Service Worker
    console.log('📋 فحص 3: Service Worker');
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker جاهز:', registration.scope);

      if (!registration.active) {
        console.warn('⚠️ Service Worker غير نشط');
      } else {
        console.log('✅ Service Worker نشط');
      }
    } catch (error: any) {
      console.error('❌ خطأ في Service Worker:', error);
      return;
    }

    // فحص 4: متغيرات البيئة
    console.log('📋 فحص 4: متغيرات البيئة');
    const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    console.log('VAPID Key:', vapidKey ? '✅ موجود' : '❌ غير موجود');
    console.log('API Key:', apiKey ? '✅ موجود' : '❌ غير موجود');
    console.log('Project ID:', projectId ? '✅ موجود' : '❌ غير موجود');

    if (!vapidKey) {
      console.error('❌ مفتاح VAPID غير محدد - هذا يسبب خطأ 401');
      console.log('🔧 الحل: أضف VITE_FCM_VAPID_KEY إلى ملف .env');
    }

    if (!apiKey || !projectId) {
      console.error('❌ إعدادات Firebase غير مكتملة');
    }

    // فحص 5: Firebase Messaging
    console.log('📋 فحص 5: Firebase Messaging');
    try {
      const messaging = getMessagingInstance();
      if (!messaging) {
        console.error('❌ Firebase Messaging غير متاح');
        return;
      } else {
        console.log('✅ Firebase Messaging متاح');
      }

      // محاولة الحصول على التوكن
      console.log('📋 محاولة الحصول على FCM Token...');
      const token = await getToken(messaging, {
        vapidKey: vapidKey || 'BEl62iUYgUivxIkv69yViEuiBIa40HIcF6j7Qb8JjS5XryPDA5gJINq7StgcSOYOGpCM2zsJIlhrqH7UvXy4i0',
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });

      if (token) {
        console.log('✅ تم الحصول على FCM Token بنجاح:', token.substring(0, 20) + '...');
        console.log('🎉 FCM يعمل بشكل صحيح!');
      } else {
        console.error('❌ لم يتم الحصول على FCM Token');
      }
    } catch (error: any) {
      console.error('❌ خطأ في FCM:', error);

      if (error.message && error.message.includes('401')) {
        console.error('🔍 تفاصيل الخطأ 401:');
        console.error('- قد يكون مفتاح VAPID غير صحيح');
        console.error('- قد لا تكون Web Push مفعلة في Firebase Console');
        console.error('- قد يكون هناك مشكلة في إعدادات Firebase project');
        console.log('🔧 الحلول المقترحة:');
        console.log('1. اذهب إلى Firebase Console > Project Settings > Cloud Messaging');
        console.log('2. تأكد من وجود Web Push certificates');
        console.log('3. إذا لم يكن موجوداً، انقر على "Generate key pair"');
        console.log('4. انسخ المفتاح الجديد إلى VITE_FCM_VAPID_KEY في ملف .env');
      }
    }

    console.log('🏁 انتهى التشخيص');
  }
}));
