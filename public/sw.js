// Service Worker للتطبيق
// Firebase Messaging for background notifications
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

try {
  firebase.initializeApp({
    apiKey: "AIzaSyBgobPK7uwaAcGEUxBpi7WY7sAIDlIt5sQ",
    authDomain: "mayor-plan.firebaseapp.com",
    projectId: "mayor-plan",
    storageBucket: "mayor-plan.appspot.com",
    messagingSenderId: "604154242666",
    appId: "1:604154242666:web:a109449fae6dd1bd908c13",
  });
  const swMessaging = firebase.messaging();
  swMessaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const title = notification.title || 'إشعار جديد';
    const options = {
      body: notification.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'appointment-notification',
      data: payload.data || {},
      requireInteraction: true
    };
    self.registration.showNotification(title, options);
  });
} catch (e) {
  // ignore init errors; caching still works
}
const CACHE_NAME = 'mayor-appointments-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  // اترك الأصول المجمعة لإدارة Vite/Workbox أو التحميل الشبكي لتجنّب فشل التثبيت عند تغيّر أسماء الملفات
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// اعتراض الطلبات
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // إرجاع الملف من الكاش إذا وجد
        if (response) {
          return response;
        }
        
        // إرجاع الطلب من الشبكة
        return fetch(event.request);
      }
    )
  );
});

// Handle messages from client to show a notification via SW (for better lock screen support)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    const title = data.title || 'إشعار جديد';
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag || 'appointment-notification',
      data: data.data || {},
      requireInteraction: true
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Ensure notification clicks focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = (event.notification && event.notification.data) || {};
  const urlToOpen = data.appointmentId ? `/?notify=1&appointmentId=${data.appointmentId}` : '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if ('focus' in client) {
        client.navigate(urlToOpen);
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  })());
});