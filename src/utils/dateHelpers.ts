import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';

// تنسيق التاريخ باللغة العربية
export const formatDate = (date: Date, formatStr: string = 'dd/MM/yyyy'): string => {
  return format(date, formatStr, { locale: ar });
};

// تنسيق التاريخ والوقت
export const formatDateTime = (date: Date): string => {
  return format(date, 'dd/MM/yyyy HH:mm', { locale: ar });
};

// تنسيق الوقت فقط
export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm', { locale: ar });
};

// المسافة الزمنية من الآن
export const getTimeAgo = (date: Date): string => {
  return formatDistanceToNow(date, { 
    addSuffix: true, 
    locale: ar 
  });
};

// التحقق من أن التاريخ هو اليوم
export const isDateToday = (date: Date): boolean => {
  return isToday(date);
};

// التحقق من أن التاريخ هو غداً
export const isDateTomorrow = (date: Date): boolean => {
  return isTomorrow(date);
};

// التحقق من أن التاريخ هو أمس
export const isDateYesterday = (date: Date): boolean => {
  return isYesterday(date);
};

// تنسيق التاريخ بشكل ذكي
export const formatSmartDate = (date: Date): string => {
  if (isDateToday(date)) {
    return `اليوم ${formatTime(date)}`;
  } else if (isDateTomorrow(date)) {
    return `غداً ${formatTime(date)}`;
  } else if (isDateYesterday(date)) {
    return `أمس ${formatTime(date)}`;
  } else {
    return formatDateTime(date);
  }
};

// تحويل التاريخ إلى نص مقروء
export const getReadableDate = (date: Date): string => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'اليوم';
  } else if (diffDays === 1) {
    return 'غداً';
  } else if (diffDays === -1) {
    return 'أمس';
  } else if (diffDays > 0 && diffDays <= 7) {
    return `بعد ${diffDays} أيام`;
  } else if (diffDays < 0 && diffDays >= -7) {
    return `منذ ${Math.abs(diffDays)} أيام`;
  } else {
    return formatDate(date);
  }
};
