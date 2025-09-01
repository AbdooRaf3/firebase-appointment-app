import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

const NotificationBell: React.FC = () => {
  const { user } = useAuthStore();
  const { notifications, unreadCount, loadNotifications, markAsRead, deleteNotification } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const unsubscribe = loadNotifications(user.uid);
      return unsubscribe;
    }
  }, [user, loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (type: string) => {
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
  };

  const getNotificationColor = (type: string) => {
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
  };

  return (
    <div className="relative">
      {/* زر جرس الإشعارات */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors touch-target ios-button"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* قائمة الإشعارات */}
      {isOpen && (
        <>
          {/* خلفية شفافة للهواتف */}
          <div 
            className="fixed inset-0 z-40 md:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto ios-scroll md:block mobile-dropdown-content md:relative md:mt-2 md:w-80 md:max-h-96">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">الإشعارات</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount} إشعار غير مقروء
              </p>
            )}
          </div>

          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 mb-2 rounded-lg border ${getNotificationColor(notification.type)} ${
                    !notification.isRead ? 'ring-2 ring-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 space-x-reverse">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {notification.title}
                        </h4>
                        <p className="text-gray-600 text-sm mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {notification.createdAt?.toLocaleString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 space-x-reverse">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id!)}
                          className="text-xs text-blue-600 hover:text-blue-800 touch-target px-2 py-1 rounded"
                        >
                          تحديد كمقروء
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id!)}
                        className="text-xs text-red-600 hover:text-red-800 touch-target px-2 py-1 rounded"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  notifications.forEach(n => {
                    if (!n.isRead) markAsRead(n.id!);
                  });
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-2"
              >
                تحديد الكل كمقروء
              </button>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
