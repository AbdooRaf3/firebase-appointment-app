# تطبيق مواعيد رئيس البلدية 🏛️

تطبيق ويب متكامل لإدارة مواعيد رئيس البلدية مبني بـ React + TypeScript + Firebase مع دعم كامل للغة العربية.

## ✨ المميزات

- **واجهة عربية 100%** مع دعم RTL
- **ثلاثة أدوار**: مدير، رئيس بلدية، سكرتير
- **إدارة المواعيد**: إنشاء، تعديل، حذف، تغيير الحالة
- **إشعارات فورية** داخل التطبيق
- **إشعارات Push** (اختيارية عبر Cloud Functions)
- **تصميم متجاوب** يعمل على جميع الأجهزة
- **PWA** قابل للتثبيت
- **أمان عالي** مع قواعد Firestore محكمة

## 🚀 التقنيات المستخدمة

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **Notifications**: Firebase Cloud Messaging (FCM)
- **PWA**: Service Worker + Web App Manifest

## 📋 المتطلبات

- Node.js 18+ 
- npm أو yarn
- حساب Firebase
- متصفح حديث يدعم Service Workers

## 🛠️ التثبيت والإعداد

### 1. استنساخ المشروع

```bash
git clone <repository-url>
cd mayor-appointment-app
```

### 2. تثبيت التبعيات

```bash
npm install
```

### 3. إعداد Firebase

#### أ. إنشاء مشروع Firebase
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. أنشئ مشروع جديد
3. فعّل Authentication (Email/Password)
4. أنشئ قاعدة بيانات Firestore
5. فعّل Cloud Messaging

#### ب. إعداد متغيرات البيئة
انسخ ملف `env.example` إلى `.env.local` واملأ القيم:

```bash
cp env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FCM_VAPID_KEY=your_vapid_key
```

#### ج. إعداد FCM (اختياري)
1. في Firebase Console، اذهب إلى Project Settings > Cloud Messaging
2. انسخ Server Key و VAPID Key
3. ضع VAPID Key في `.env.local`

### 4. تشغيل التطبيق

```bash
# التطوير
npm run dev

# البناء للإنتاج
npm run build

# معاينة الإنتاج
npm run preview
```

### 5. اختبار Emulators (اختياري)

```bash
# تشغيل Emulators
npm run emulate

# في terminal منفصل
npm run dev
```

## 🏗️ بنية المشروع

```
src/
├── components/          # المكونات المشتركة
├── firebase/           # إعدادات Firebase
├── hooks/              # Custom Hooks
├── pages/              # صفحات التطبيق
├── store/              # إدارة الحالة (Zustand)
├── types/              # أنواع TypeScript
└── utils/              # دوال مساعدة

functions/               # Cloud Functions (اختياري)
public/                  # الملفات العامة
```

## 👥 الأدوار والصلاحيات

### المدير (Admin)
- إدارة المستخدمين (إضافة، تعديل، حذف)
- تعيين الأدوار
- عرض جميع المواعيد
- إدارة النظام بالكامل

### رئيس البلدية (Mayor)
- عرض المواعيد المخصصة له
- تغيير حالة المواعيد
- تصفية المواعيد (اليوم، قادمة، مكتملة)

### السكرتير (Secretary)
- إنشاء مواعيد جديدة
- تعديل المواعيد التي أنشأها
- حذف المواعيد
- تغيير حالة المواعيد

## 🔐 قواعد الأمان

تم تطبيق قواعد أمان صارمة في Firestore:

- **المستخدمين**: المدير فقط يمكنه إدارة المستخدمين
- **المواعيد**: كل مستخدم يرى ما يخصه فقط
- **التوكنات**: كل مستخدم يدير توكناته الخاصة

## 📱 PWA Features

- **Service Worker** لـ FCM
- **Web App Manifest** للتثبيت
- **Offline Support** مع Firestore Persistence
- **Push Notifications** (اختياري)

## 🚀 النشر

### 1. بناء التطبيق

```bash
npm run build
```

### 2. نشر على Firebase Hosting

```bash
# تسجيل الدخول لـ Firebase
firebase login

# تهيئة المشروع
firebase init

# نشر التطبيق
npm run deploy
```

### 3. نشر Cloud Functions (اختياري)

```bash
# نشر Functions
npm run deploy:functions

# نشر الكل
npm run deploy:all
```

## 🔧 التخصيص

### تغيير الألوان
عدّل ملف `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      primary: {
        500: '#your-color',
        600: '#your-dark-color',
      }
    }
  }
}
```

### إضافة لغات جديدة
1. أضف ملفات الترجمة في `src/locales/`
2. عدّل `src/App.tsx` لدعم تبديل اللغة
3. أضف دعم RTL للغات الجديدة

## 🐛 استكشاف الأخطاء

### مشاكل شائعة

#### 1. خطأ في Firebase
- تأكد من صحة متغيرات البيئة
- تحقق من قواعد Firestore
- تأكد من تفعيل الخدمات المطلوبة

#### 2. مشاكل في الإشعارات
- تحقق من إذن الإشعارات في المتصفح
- تأكد من صحة VAPID Key
- تحقق من Service Worker

#### 3. مشاكل في التطوير
- امسح cache المتصفح
- أعد تشغيل dev server
- تحقق من تثبيت التبعيات

### سجلات الأخطاء

```bash
# عرض سجلات Firebase
firebase functions:log

# عرض سجلات التطبيق
# افتح Developer Tools > Console
```

## 📚 الوثائق المرجعية

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)

## 🤝 المساهمة

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للـ branch (`git push origin feature/amazing-feature`)
5. افتح Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 الدعم

إذا واجهت أي مشاكل أو لديك أسئلة:

1. افحص [Issues](https://github.com/your-repo/issues)
2. ابحث في [Discussions](https://github.com/your-repo/discussions)
3. افتح Issue جديد

## 🙏 شكر وتقدير

- فريق Firebase لـ SDK الممتاز
- مجتمع React للدعم المستمر
- Tailwind CSS للتصميم الجميل
- جميع المساهمين في المشروع

---

**ملاحظة**: هذا التطبيق مصمم للعمل مع خطة Firebase Spark. لاستخدام Cloud Functions، قد تحتاج إلى الترقية لخطة Blaze.
