import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
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

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // تحميل الإشعارات
  useEffect(() => {
    if (user) {
      try {
        const unsubscribe = loadNotifications(user.uid);
        return unsubscribe;
      } catch (error) {
        console.error('فشل في تحميل الإشعارات:', error);
      }
    }
  }, [user, loadNotifications]);

  // إغلاق عند الضغط خارج القائمة (Desktop + Mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // تحديد مكان القائمة
  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = 320; // w-80 = 320px

      if (buttonRect.right + dropdownWidth <= viewportWidth) {
        setDropdownPosition('right');
      } else {
        setDropdownPosition('left');
      }
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen) calculateDropdownPosition();
    setIsOpen(!isOpen);
  };

  // دوال مساعدة
  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    for (const n of notifications) {
      if (!n.isRead) await markAsRead(n.id!);
    }
  };

  const handleDeleteAll = async () => {
    for (const n of notifications) {
      await deleteNotification(n.id!);
    }
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

  // عرض وقت الإشعار بالتاريخ الميلادي
  const formatDate = (date: any) => {
    if (!date) return '—';
    try {
      if (date.toDate) {
        return date.toDate().toLocaleString('en-US');
      }
      if (date instanceof Date) {
        return date.toLocaleString('en-US');
      }
      return String(date);
    } catch {
      return '—';
    }
  };

  const renderNotificationContent = () => (
    <>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {unreadCount > 0 && (
          <p className="text-sm text-gray-600 mt-1">{unreadCount} unread</p>
        )}
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <div className="text-2xl mb-2">⚠️</div>
            <p>Failed to load notifications</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>No notifications</p>
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
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id!)}
                    className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 flex justify-between">
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Mark all as read
          </button>
          <button
            onClick={handleDeleteAll}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Delete all
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="relative">
      {/* زر الجرس */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
        title="Notifications"
        disabled={isLoading}
      >
        <Bell className={`w-6 h-6 ${isLoading ? 'animate-pulse' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {error && (
          <span className="absolute -top-1 -left-1 bg-yellow-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            ⚠️
          </span>
        )}
      </button>

      {/* القائمة */}
      {isOpen && (
        <>
          {/* للموبايل */}
          <div className="fixed inset-0 z-40 md:hidden bg-black/20" />
          <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              ref={dropdownRef}
              className="w-full max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto"
            >
              {renderNotificationContent()}
            </div>
          </div>

          {/* للكمبيوتر */}
          <div
            ref={dropdownRef}
            className={`hidden md:block absolute mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto transition-all duration-200 ${
              dropdownPosition === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {renderNotificationContent()}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
