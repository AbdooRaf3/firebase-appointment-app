import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

const NotificationBell: React.FC = () => {
  const { user } = useAuthStore();
  const { notifications, unreadCount, loadNotifications, markAsRead, deleteNotification } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('right');
  const buttonRef = React.useRef<HTMLButtonElement>(null);

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

  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = 320; // w-80 = 320px
      
      // إذا كان هناك مساحة كافية على اليمين، ضع القائمة على اليمين
      if (buttonRect.right + dropdownWidth <= viewportWidth) {
        setDropdownPosition('right');
      } else {
        // وإلا ضعها على اليسار
        setDropdownPosition('left');
      }
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen) {
      calculateDropdownPosition();
    }
    setIsOpen(!isOpen);
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

  const renderNotificationContent = () => (
    <>
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
    </>
  );

  return (
    <div className="relative">
      {/* زر جرس الإشعارات */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
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
          
          {/* قائمة الإشعارات للهواتف - تظهر في المنتصف */}
          <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto">
              {renderNotificationContent()}
            </div>
          </div>
          
          {/* قائمة الإشعارات لأجهزة الكمبيوتر */}
          <div className={`hidden md:block absolute mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto ${
            dropdownPosition === 'right' 
              ? 'right-0' 
              : 'left-0'
          }`}>
            {renderNotificationContent()}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
