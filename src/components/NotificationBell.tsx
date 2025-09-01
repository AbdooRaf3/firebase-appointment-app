import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

const NotificationBell: React.FC = () => {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loadNotifications,
    markAsRead,
    deleteNotification,
    unsubscribeFromNotifications,
    sendNotification,
    isLoading,
    error,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);

  // فحص نوع الجهاز
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // تحميل الإشعارات
  useEffect(() => {
    if (user) {
      try {
        loadNotifications(user.uid);
      } catch (error) {
        console.error('❌ فشل في تحميل الإشعارات:', error);
      }
    }
    
    // تنظيف عند إلغاء المكون
    return () => {
      unsubscribeFromNotifications();
    };
  }, [user, loadNotifications, unsubscribeFromNotifications]);

  // إغلاق عند الضغط خارج القائمة
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // منع التمرير عند فتح القائمة على الموبايل
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isMobile]);

  // معالجة السحب للموبايل
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    dragStartY.current = e.touches[0].clientY;
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY.current;
    
    if (diff > 0) { // السحب للأسفل فقط
      setDragOffset(diff);
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    
    if (dragOffset > 100) { // إذا تم السحب أكثر من 100px
      setIsOpen(false);
    }
    
    setDragOffset(0);
  }, [isMobile, dragOffset]);

  const handleToggleModal = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    if (newState) {
      console.log('تم فتح قائمة الإشعارات');
    }
  }, [isOpen]);

  // دوال مساعدة
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      console.log('تم تمييز الإشعار كقراءة');
    } catch (error) {
      console.error('فشل في تمييز الإشعار كقراءة:', error);
    }
  }, [markAsRead]);

  const handleDelete = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      console.log('تم حذف الإشعار');
    } catch (error) {
      console.error('فشل في حذف الإشعار:', error);
    }
  }, [deleteNotification]);

  const handleMarkAllAsRead = useCallback(async () => {
    for (const notification of notifications) {
      if (!notification.isRead) {
        await markAsRead(notification.id!);
      }
    }
  }, [notifications, markAsRead]);

  const handleDeleteAll = useCallback(async () => {
    for (const notification of notifications) {
      await deleteNotification(notification.id!);
    }
  }, [notifications, deleteNotification]);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'appointment_created':
        return '📅';
      case 'appointment_reminder':
        return '⏰';
      case 'status_changed':
        return '🔄';
      default:
        return '🔔';
    }
  }, []);

  const getNotificationColor = useCallback((type: string) => {
    switch (type) {
      case 'appointment_created':
        return 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50';
      case 'appointment_reminder':
        return 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50';
      case 'status_changed':
        return 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50';
      default:
        return 'border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50';
    }
  }, []);

  const formatDate = useCallback((date: any) => {
    if (!date) return '—';
    try {
      if (date.toDate) {
        return date.toDate().toLocaleString('ar-SA');
      }
      if (date instanceof Date) {
        return date.toLocaleString('ar-SA');
      }
      return String(date);
    } catch {
      return '—';
    }
  }, []);

  const renderNotificationContent = useCallback(() => {
    return (
      <>
        {/* رأس القائمة مع مؤشر السحب */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          {/* مؤشر السحب للموبايل */}
          {isMobile && (
            <div className="flex justify-center mb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="text-xl">🔔</span>
              <h3 className="text-lg font-bold text-gray-900">الإشعارات</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
              title="إغلاق"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadCount} غير مقروء
              </span>
            </div>
          )}
        </div>

        {/* محتوى الإشعارات */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="mr-3 text-gray-500">جاري التحميل...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 px-4">
              <div className="text-red-500 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium">فشل في تحميل الإشعارات</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6m-6 0V5a2 2 0 012-2h6a2 2 0 012 2v14m-6 0v-5" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">لا توجد إشعارات</p>
              <p className="text-sm text-gray-400 mt-1">ستظهر الإشعارات الجديدة هنا</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative p-4 rounded-xl border transition-all duration-200 ${
                    getNotificationColor(notification.type)
                  } ${!notification.isRead ? 'ring-2 ring-blue-200 shadow-sm' : ''}`}
                >
                  {/* مؤشر القراءة */}
                  {!notification.isRead && (
                    <div className="absolute top-3 right-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  
                  <div className="flex items-start space-x-3 space-x-reverse">
                    {/* أيقونة الإشعار */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                      </div>
                    </div>
                    
                    {/* محتوى الإشعار */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                        {notification.title}
                      </h4>
                      <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-100">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id!)}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors flex items-center space-x-1 space-x-reverse"
                        title="تمييز كقراءة"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>قراءة</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id!)}
                      className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-md hover:bg-red-50 transition-colors flex items-center space-x-1 space-x-reverse mr-2"
                      title="حذف"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* أزرار الإجراءات */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {notifications.length > 0 ? (
            <div className="flex space-x-2 space-x-reverse">
              <button
                onClick={handleMarkAllAsRead}
                className="flex-1 text-sm text-blue-600 hover:text-blue-800 transition-colors px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 font-medium"
              >
                تمييز جميعها كقراءة
              </button>
              <button
                onClick={handleDeleteAll}
                className="flex-1 text-sm text-red-600 hover:text-red-800 transition-colors px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 font-medium"
              >
                حذف جميعها
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={async () => {
                  if (user) {
                    await sendNotification({
                      userId: user.uid,
                      title: 'إشعار تجريبي',
                      message: 'هذا إشعار تجريبي لاختبار النظام',
                      type: 'general'
                    });
                  }
                }}
                className="w-full text-sm text-green-600 hover:text-green-800 transition-colors px-4 py-2 rounded-lg border border-green-200 hover:bg-green-50 font-medium"
              >
                إرسال إشعار تجريبي
              </button>
            </div>
          )}
        </div>
      </>
    );
  }, [notifications, isLoading, error, unreadCount, getNotificationColor, getNotificationIcon, formatDate, handleMarkAsRead, handleDelete, handleMarkAllAsRead, handleDeleteAll, user, sendNotification, isMobile]);

  return (
    <div className="relative">
      {/* زر الجرس */}
      <button
        ref={buttonRef}
        onClick={handleToggleModal}
        className={`relative p-3 transition-all duration-300 rounded-xl ${
          isOpen 
            ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg ring-2 ring-blue-200' 
            : 'text-gray-600 hover:text-gray-800 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-xl hover:shadow-md'
        }`}
        title="الإشعارات"
        disabled={isLoading}
      >
        <div className="relative">
          <span className={`text-xl ${isLoading ? 'animate-pulse' : ''} ${isOpen ? 'animate-bounce' : ''}`}>
            🔔
          </span>
          
          {/* مؤشر الإشعارات غير المقروءة */}
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          
          {/* مؤشر الخطأ */}
          {error && (
            <span className="absolute -top-2 -left-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg border-2 border-white">
              !
            </span>
          )}
        </div>
      </button>

      {/* Modal للإشعارات */}
      {isOpen && (
        <>
          {/* خلفية معتمة مع إمكانية النقر للإغلاق */}
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[10000] flex items-end justify-center p-4">
            <div
              ref={modalRef}
              className={`w-full max-w-md bg-white rounded-t-2xl shadow-2xl border border-gray-200 transform transition-all duration-300 ease-out ${
                isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
              }`}
              style={{ 
                maxHeight: '80vh',
                transform: `translateY(${dragOffset}px)`
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              {renderNotificationContent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
