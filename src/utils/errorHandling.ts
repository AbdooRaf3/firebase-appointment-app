// معالجة أخطاء Firebase
export const getFirebaseErrorMessage = (errorCode: string): string => {
  const errorMessages: { [key: string]: string } = {
    // أخطاء المصادقة
    'auth/user-not-found': 'البريد الإلكتروني غير مسجل',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
    'auth/weak-password': 'كلمة المرور ضعيفة جداً',
    'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
    'auth/too-many-requests': 'تم تجاوز عدد المحاولات المسموح، حاول لاحقاً',
    'auth/user-disabled': 'تم تعطيل الحساب',
    'auth/operation-not-allowed': 'العملية غير مسموح بها',
    'auth/invalid-credential': 'بيانات الاعتماد غير صحيحة',
    
    // أخطاء Firestore
    'permission-denied': 'ليس لديك صلاحية للقيام بهذه العملية',
    'unauthenticated': 'يجب تسجيل الدخول أولاً',
    'not-found': 'المستند غير موجود',
    'already-exists': 'المستند موجود بالفعل',
    'resource-exhausted': 'تم استنفاذ الموارد',
    'failed-precondition': 'فشل في الشرط المسبق',
    'aborted': 'تم إلغاء العملية',
    'out-of-range': 'القيمة خارج النطاق المسموح',
    'unimplemented': 'العملية غير منفذة',
    'internal': 'خطأ داخلي في الخادم',
    'unavailable': 'الخدمة غير متاحة حالياً',
    'data-loss': 'فقدان البيانات',
    
    // أخطاء عامة
    'network-request-failed': 'فشل في الاتصال بالشبكة',
    'storage/unauthorized': 'غير مصرح بالوصول للتخزين',
    'storage/canceled': 'تم إلغاء عملية التخزين',
    'storage/unknown': 'خطأ غير معروف في التخزين'
  };

  return errorMessages[errorCode] || 'حدث خطأ غير متوقع';
};

// معالجة الأخطاء العامة
export const handleError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.code) {
    return getFirebaseErrorMessage(error.code);
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'حدث خطأ غير متوقع';
};

// تسجيل الأخطاء
export const logError = (error: any, context?: string): void => {
  const errorMessage = handleError(error);
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}] ${context ? `[${context}] ` : ''}${errorMessage}`, error);
  
  // يمكن إضافة إرسال الأخطاء إلى خدمة خارجية هنا
  // مثل Sentry أو LogRocket
};

// التحقق من صحة البيانات
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} مطلوب`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'البريد الإلكتروني غير صحيح';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 6) {
    return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
  }
  return null;
};
