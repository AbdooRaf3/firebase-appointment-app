import React from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

interface NotificationMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

const NotificationMenu: React.FC<NotificationMenuProps> = ({
  isOpen,
  onToggle,
  onKeyDown
}) => {
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

  // تحميل الإشعارات عند فتح القائمة
  React.useEffect(() => {
    if (!user?.uid) return;
    if (isOpen) {
      loadNotifications(user.uid);
      return () => unsubscribeFromNotifications();
    }
  }, [user, isOpen, loadNotifications, unsubscribeFromNotifications]);

  // Helpers
  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "appointment_created":
        return "📅";
      case "appointment_reminder":
        return "⏰";
      case "status_changed":
        return "🔄";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type?: string) => {
    switch (type) {
      case "appointment_created":
        return "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50";
      case "appointment_reminder":
        return "border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50";
      case "status_changed":
        return "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50";
      default:
        return "border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50";
    }
  };

  const formatDate = (date?: any) => {
    if (!date) return "—";
    try {
      if (date && typeof date === 'object' && 'toDate' in date) {
        return date.toDate().toLocaleString("ar-SA-u-ca-gregory");
      }
      if (date instanceof Date) return date.toLocaleString("ar-SA-u-ca-gregory");
      return String(date);
    } catch {
      return "—";
    }
  };

  const handleMarkAsRead = async (id?: string) => {
    if (id) await markAsRead(id);
  };

  const handleDelete = async (id?: string) => {
    if (id) await deleteNotification(id);
  };

  const handleMarkAllAsRead = async () => {
    await Promise.all(
      notifications
        .filter((n) => !n.isRead && n.id)
        .map((n) => markAsRead(n.id!))
    );
  };

  const handleDeleteAll = async () => {
    await Promise.all(
      notifications.filter((n) => n.id).map((n) => deleteNotification(n.id!))
    );
  };

  return (
    <div className="relative">
      {/* زر الإشعارات */}
      <button
        onClick={onToggle}
        onKeyDown={(e) => onKeyDown(e, onToggle)}
        className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label="إشعارات"
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      
      {/* قائمة الإشعارات */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">الإشعارات</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>
            
            {/* قائمة الإشعارات */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">جاري التحميل...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">{error}</div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-600">لا توجد إشعارات</div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border ${getNotificationColor(n.type)} ${
                        !n.isRead ? "ring-2 ring-blue-200 shadow-sm" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3 space-x-reverse">
                        <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full">
                          {getNotificationIcon(n.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{n.title}</h4>
                          <p className="text-xs text-gray-600">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 space-x-reverse mt-2">
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            قراءة
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* الأزرار السفلية */}
            {notifications.length > 0 && (
              <div className="flex space-x-2 space-x-reverse mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  تمييز جميعها كقراءة
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                >
                  حذف جميعها
                </button>
              </div>
            )}
            
            {/* أزرار الاختبار */}
            <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
              <button
                onClick={async () => {
                  if (user?.uid) {
                    await sendNotification({
                      userId: user.uid,
                      title: "إشعار تجريبي",
                      message: "هذا إشعار تجريبي لاختبار النظام",
                      type: "general",
                    });
                  }
                }}
                className="w-full px-4 py-2 text-sm border rounded-lg text-green-600 border-green-200 hover:bg-green-50"
              >
                إرسال إشعار تجريبي
              </button>
              
              <button
                onClick={async () => {
                  const { sendPhoneNotification } = useNotificationStore.getState();
                  await sendPhoneNotification(
                    "اختبار شاشة القفل",
                    "هذا اختبار لإشعارات شاشة القفل"
                  );
                }}
                className="w-full px-4 py-2 text-sm border rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                اختبار شاشة القفل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;
