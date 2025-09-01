# دليل الإنتاج النهائي - تطبيق مواعيد رئيس البلدية

## 🚀 تجهيز التطبيق للإنتاج

### 1. إعداد البيئة
```bash
# نسخ ملف البيئة
cp env.production .env.production

# تعديل المتغيرات في .env.production
# تحديث معلومات Firebase الخاصة بك
```

### 2. بناء التطبيق للإنتاج
```bash
# بناء التطبيق
npm run build:prod

# اختبار البناء
npm run test:build
```

### 3. النشر على Firebase
```bash
# تسجيل الدخول لـ Firebase
firebase login

# تحديد المشروع
firebase use your-project-id

# نشر التطبيق
npm run deploy

# أو نشر كل شيء
npm run deploy:all
```

## 📋 متطلبات الإنتاج

### Firebase
- [ ] إنشاء مشروع Firebase جديد
- [ ] تفعيل Authentication
- [ ] تفعيل Firestore Database
- [ ] تفعيل Hosting
- [ ] تفعيل Cloud Functions (اختياري)
- [ ] إعداد قواعد الأمان

### المتغيرات البيئية
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🔒 إعدادات الأمان

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // قواعد الأمان للمواعيد
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null;
    }
    
    // قواعد الأمان للمستخدمين
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Hosting Headers
- Cache Control للملفات الثابتة
- أمان إضافي (XSS Protection, Content Type Options)
- CORS إعدادات

## 📱 تحسينات الهاتف المحمول

### PWA Features
- Service Worker
- Manifest File
- Offline Support
- Push Notifications

### Performance
- Code Splitting
- Lazy Loading
- Image Optimization
- Bundle Analysis

## 🧪 اختبار الإنتاج

### اختبار البناء
```bash
npm run test:build
```

### اختبار الأداء
```bash
npm run analyze
```

### اختبار Firebase
```bash
firebase emulators:start
```

## 📊 مراقبة الإنتاج

### Firebase Analytics
- تفعيل Analytics
- تتبع الأحداث المخصصة
- تقارير الأداء

### Error Monitoring
- Firebase Crashlytics
- Error Boundaries
- Logging

## 🚨 استكشاف الأخطاء

### مشاكل شائعة
1. **خطأ في Firebase Config**
   - تأكد من صحة المتغيرات البيئية
   - تحقق من إعدادات المشروع

2. **مشاكل في البناء**
   - `npm run type-check`
   - `npm run lint:fix`

3. **مشاكل في النشر**
   - `firebase logout && firebase login`
   - `firebase use --clear && firebase use your-project-id`

## 📞 الدعم

في حالة وجود مشاكل:
1. تحقق من سجلات Firebase Console
2. راجع إعدادات المشروع
3. تأكد من صحة قواعد الأمان
4. تحقق من متغيرات البيئة

---

**ملاحظة**: تأكد من تحديث جميع الروابط والنطاقات في الملفات قبل النشر النهائي.
