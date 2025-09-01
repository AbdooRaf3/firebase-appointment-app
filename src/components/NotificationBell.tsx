import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCircle, Trash2 } from 'lucide-react';
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
    isLoading,
    error,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('right');
  const [debugInfo, setDebugInfo] = useState<string>('');

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // تحميل الإشعارات
  useEffect(() => {
    if (user) {
      console.log('🔄 بدء تحميل الإشعارات للمستخدم:', user.uid);
      try {
        const unsubscribe = loadNotifications(user.uid);
        console.log('✅ تم إعداد مراقب الإشعارات:', unsubscribe);
        return unsubscribe;
      } catch (error) {
        console.error('❌ فشل في تحميل الإشعارات:', error);
      }
    }
  }, [user, loadNotifications]);

  // إغلاق عند الضغط خارج القائمة
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        console.log('🔄 إغلاق القائمة - ضغط خارج');
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // تحديد مكان القائمة
  const calculateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = 320; // w-80 = 320px

      const newPosition = buttonRect.right + dropdownWidth <= viewportWidth ? 'right' : 'left';
      setDropdownPosition(newPosition);
      console.log('📍 موضع القائمة:', newPosition, 'buttonRect:', buttonRect);
    }
  }, []);

  const handleToggleDropdown = useCallback(() => {
    console.log('🔄 الضغط على الجرس - الحالة الحالية:', isOpen);
    
    if (!isOpen) {
      calculateDropdownPosition();
    }
    
    const newState = !isOpen;
    console.log('🔄 تغيير الحالة إلى:', newState);
    setIsOpen(newState);
    
    // تحديث معلومات التشخيص
    setDebugInfo(`isOpen: ${newState} | Count: ${notifications.length} | Loading: ${isLoading} | Error: ${error || 'none'}`);
  }, [isOpen, calculateDropdownPosition, notifications.length, isLoading, error]);

  // دوال مساعدة
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    console.log('📖 تمييز كقراءة:', notificationId);
    await markAsRead(notificationId);
  }, [markAsRead]);

  const handleDelete = useCallback(async (notificationId: string) => {
    console.log('🗑️ حذف الإشعار:', notificationId);
    await deleteNotification(notificationId);
  }, [deleteNotification]);

  const handleMarkAllAsRead = useCallback(async () => {
    console.log('📖 تمييز جميع الإشعارات كقراءة');
    for (const notification of notifications) {
      if (!notification.isRead) {
        await markAsRead(notification.id!);
      }
    }
  }, [notifications, markAsRead]);

  const handleDeleteAll = useCallback(async () => {
    console.log('🗑️ حذف جميع الإشعارات');
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
        return 'border-blue-200 bg-blue-50';
      case 'appointment_reminder':
        return 'border-yellow-200 bg-yellow-50';
      case 'status_changed':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
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

  // تحديث معلومات التشخيص
  useEffect(() => {
    setDebugInfo(`isOpen: ${isOpen} | Count: ${notifications.length} | Loading: ${isLoading} | Error: ${error || 'none'}`);
  }, [isOpen, notifications.length, isLoading, error]);

  const renderNotificationContent = useCallback(() => {
    console.log('🎨 renderNotificationContent() - notifications:', notifications);
    console.log('🎨 renderNotificationContent() - isLoading:', isLoading);
    console.log('🎨 renderNotificationContent() - error:', error);
    console.log('🎨 renderNotificationContent() - isOpen:', isOpen);
    console.log('🎨 renderNotificationContent() - dropdownPosition:', dropdownPosition);
    
    return (
      <>
        {/* مؤشر تشخيص */}
        <div className="p-2 bg-yellow-100 border-b border-yellow-300 text-xs text-yellow-800">
          🔍 DEBUG: renderNotificationContent() - notifications.length = {notifications.length} | isLoading = {isLoading.toString()} | error = {error || 'none'} | isOpen = {isOpen.toString()}
        </div>
        
        {/* رأس القائمة */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">الإشعارات</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">{unreadCount} غير مقروء</p>
          )}
        </div>

        {/* محتوى الإشعارات */}
        <div className="p-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>جاري التحميل...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <div className="text-2xl mb-2">⚠️</div>
              <p>فشل في تحميل الإشعارات</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>لا توجد إشعارات</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 mb-2 rounded-lg border ${getNotificationColor(
                  notification.type
                )} ${!notification.isRead ? 'ring-2 ring-blue-200' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <span className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {notification.title}
                      </h4>
                      <p className="text-gray-600 text-sm mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2 space-x-reverse">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id!)}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded transition-colors"
                        title="تمييز كقراءة"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id!)}
                      className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* أزرار الإجراءات */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-gray-200 flex justify-between">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              تمييز جميعها كقراءة
            </button>
            <button
              onClick={handleDeleteAll}
              className="text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              حذف جميعها
            </button>
          </div>
        )}
      </>
    );
  }, [notifications, isLoading, error, isOpen, dropdownPosition, getNotificationColor, getNotificationIcon, formatDate, handleMarkAsRead, handleDelete, handleMarkAllAsRead, handleDeleteAll]);

  return (
    <div className="relative">
      {/* زر الجرس */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className={`relative p-2 transition-all duration-200 ${
          isOpen 
            ? 'text-blue-600 bg-blue-50 rounded-lg shadow-md' 
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg'
        }`}
        title="الإشعارات"
        disabled={isLoading}
      >
        <Bell className={`w-6 h-6 ${isLoading ? 'animate-pulse' : ''} ${isOpen ? 'animate-bounce' : ''}`} />
        
        {/* مؤشر الإشعارات غير المقروءة */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* مؤشر الخطأ */}
        {error && (
          <span className="absolute -top-1 -left-1 bg-yellow-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            ⚠️
          </span>
        )}
      </button>

      {/* مؤشر حالة القائمة */}
      <div className="absolute top-full left-0 mt-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded z-50">
        🔍 DEBUG: {debugInfo}
      </div>
      
      {/* مؤشر القائمة */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-8 text-xs text-gray-500 bg-red-100 px-2 py-1 rounded border border-red-300 z-50">
          🔍 DEBUG: القائمة مفتوحة - notifications.length = {notifications.length} | dropdownPosition = {dropdownPosition}
        </div>
      )}
      
      {/* القائمة */}
      {isOpen && (
        <>
          {/* مؤشر تشخيص القائمة */}
          <div className="fixed top-0 left-0 bg-green-500 text-white p-2 text-xs z-[9999]">
            🎯 القائمة مفتوحة - isOpen = {isOpen.toString()}
          </div>
          
          {/* للموبايل */}
          <div className="fixed inset-0 z-40 md:hidden bg-black/20" />
          <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              ref={dropdownRef}
              className="w-full max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto"
              style={{ 
                border: '3px solid blue',
                backgroundColor: 'white',
                position: 'relative',
                zIndex: 9999
              }}
            >
              {renderNotificationContent()}
            </div>
          </div>

          {/* للكمبيوتر */}
          <div
            ref={dropdownRef}
            className={`hidden md:block absolute mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] max-h-96 overflow-y-auto transition-all duration-200 ${
              dropdownPosition === 'right' ? 'right-0' : 'left-0'
            }`}
            style={{ 
              border: '3px solid red',
              backgroundColor: 'white',
              position: 'absolute',
              top: '100%',
              marginTop: '8px'
            }}
          >
            {renderNotificationContent()}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
