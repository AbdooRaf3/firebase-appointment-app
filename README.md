# تطبيق مواعيد رئيس البلدية 🏛️

تطبيق ويب متقدم لإدارة مواعيد رئيس البلدية، مبني بـ React + TypeScript + Firebase مع دعم كامل للهواتف المحمولة.

## ✨ المميزات

- 🔐 نظام مصادقة آمن
- 📅 إدارة المواعيد
- 👥 لوحات تحكم متعددة (رئيس البلدية، السكرتير، المدير)
- 📱 تطبيق ويب تقدمي (PWA)
- 🎨 تصميم متجاوب ومحسن للهواتف
- 🔔 إشعارات فورية
- 🌐 دعم اللغة العربية
- ⚡ أداء عالي

## 🚀 التثبيت والتشغيل

### المتطلبات
- Node.js 18+
- npm أو yarn
- حساب Firebase

### التثبيت
```bash
# استنساخ المشروع
git clone <repository-url>
cd firebase-appointment-app

# تثبيت التبعيات
npm install

# نسخ ملف البيئة
cp env.example .env.local

# تعديل متغيرات Firebase في .env.local
```

### التشغيل
```bash
# وضع التطوير
npm run dev

# بناء للإنتاج
npm run build:prod

# معاينة البناء
npm run preview
```

## 🏗️ البناء للإنتاج

### البناء المخصص
```bash
# بناء شامل مع فحوصات
npm run build:custom
```

### البناء العادي
```bash
# بناء سريع
npm run build:prod
```

## 🚀 النشر

### على Firebase
```bash
# تسجيل الدخول
firebase login

# تحديد المشروع
firebase use your-project-id

# نشر التطبيق
npm run deploy

# نشر كل شيء
npm run deploy:all
```

### على منصات أخرى
- Netlify
- Vercel
- GitHub Pages
- أي منصة استضافة ثابتة

## 📱 PWA Features

- Service Worker
- Offline Support
- Push Notifications
- App Installation
- Responsive Design

## 🔧 التقنيات المستخدمة

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Firebase
- **Build Tool**: Vite
- **PWA**: Workbox

## 📁 هيكل المشروع

```
src/
├── components/          # المكونات
├── pages/              # الصفحات
├── store/              # إدارة الحالة
├── firebase/           # إعدادات Firebase
├── types/              # أنواع TypeScript
├── utils/              # أدوات مساعدة
└── mobile/             # تحسينات الهاتف المحمول
```

## 🔒 الأمان

- قواعد Firestore آمنة
- مصادقة المستخدمين
- حماية من XSS
- إعدادات CORS آمنة

## 📊 الأداء

- Code Splitting
- Lazy Loading
- Image Optimization
- Bundle Analysis
- Performance Monitoring

## 🧪 الاختبار

```bash
# فحص TypeScript
npm run type-check

# فحص ESLint
npm run lint:fix

# اختبار البناء
npm run test:build

# تحليل الحزمة
npm run analyze
```

## 📚 الوثائق

- [دليل الإنتاج](PRODUCTION_README.md)
- [قائمة مراجعة النشر](deployment-checklist.md)
- [تحسينات الهاتف المحمول](MOBILE_OPTIMIZATION_README.md)

## 🤝 المساهمة

1. Fork المشروع
2. إنشاء فرع للميزة الجديدة
3. Commit التغييرات
4. Push للفرع
5. إنشاء Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE).

## 📞 الدعم

للمساعدة والدعم:
- إنشاء Issue
- مراجعة الوثائق
- التواصل مع المطورين

---

**ملاحظة**: تأكد من تحديث جميع المتغيرات البيئية قبل النشر!
