import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Timestamp } from "firebase/firestore";
import { useNotificationStore } from "../store/notificationStore";
import { useAuthStore } from "../store/authStore";
import "./NotificationBell.css";

type AppNotification = {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  createdAt?: Date | Timestamp | string | number;
  isRead?: boolean;
};

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

  // كشف نوع الجهاز
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = (e: MediaQueryList | MediaQueryListEvent) =>
      setIsMobile("matches" in e ? e.matches : (e as MediaQueryList).matches);
    apply(mq);
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // الاشتراك فقط عند فتح اللوحة لتقليل القراءات
  useEffect(() => {
    if (!user?.uid) return;
    if (isOpen) {
      loadNotifications(user.uid);
      return () => unsubscribeFromNotifications();
    }
  }, [user, isOpen, loadNotifications, unsubscribeFromNotifications]);

  // إغلاق بالـ Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // قفل التمرير على الموبايل
  useEffect(() => {
    if (isOpen && isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, isMobile]);

  // سحب للإغلاق
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      dragStartY.current = e.touches[0].clientY;
    },
    [isMobile]
  );
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      const diff = e.touches[0].clientY - dragStartY.current;
      if (diff > 0) setDragOffset(diff);
    },
    [isMobile]
  );
  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    if (dragOffset > 100) setIsOpen(false);
    setDragOffset(0);
  }, [isMobile, dragOffset]);

  // فتح/إغلاق مع focus + scrollIntoView
  const handleToggleModal = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      if (newState) {
        setTimeout(() => {
          modalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          modalRef.current?.focus();
        }, 50);
      }
      return newState;
    });
  }, []);

  // الإجراءات
  const handleMarkAsRead = useCallback(
    async (id?: string) => id && (await markAsRead(id)),
    [markAsRead]
  );
  const handleDelete = useCallback(
    async (id?: string) => id && (await deleteNotification(id)),
    [deleteNotification]
  );
  const handleMarkAllAsRead = useCallback(async () => {
    await Promise.all(
      (notifications as AppNotification[])
        .filter((n) => !n.isRead && n.id)
        .map((n) => markAsRead(n.id!))
    );
  }, [notifications, markAsRead]);
  const handleDeleteAll = useCallback(async () => {
    await Promise.all(
      (notifications as AppNotification[]).filter((n) => n.id).map((n) => deleteNotification(n.id!))
    );
  }, [notifications, deleteNotification]);

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
  const formatDate = (date?: Date | Timestamp | string | number) => {
    if (!date) return "—";
    try {
      if (date && typeof date === 'object' && 'toDate' in date) {
        return (date as Timestamp).toDate().toLocaleString("ar-SA");
      }
      if (date instanceof Date) return date.toLocaleString("ar-SA");
      return String(date);
    } catch {
      return "—";
    }
  };

  // محتوى القائمة
  const PanelContent = (
    <>
      {/* رأس القائمة */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
        {isMobile && (
          <div className="flex justify-center mb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
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
          >
            ✕
          </button>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center mt-2">
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
              {unreadCount} غير مقروء
            </span>
          </div>
        )}
      </div>

      {/* قائمة الإشعارات */}
      <div className="flex-1 overflow-y-auto max-h-[60vh]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">جاري التحميل...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-600">لا توجد إشعارات</div>
        ) : (
          <div className="p-2 space-y-2">
            {(notifications as AppNotification[]).map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border ${getNotificationColor(n.type)} ${
                  !n.isRead ? "ring-2 ring-blue-200 shadow-sm" : ""
                }`}
              >
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{n.title}</h4>
                    <p className="text-sm text-gray-600">{n.message}</p>
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
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
        {notifications.length > 0 ? (
          <div className="flex space-x-2 space-x-reverse">
            <button
              onClick={handleMarkAllAsRead}
              className="flex-1 px-3 py-2 text-sm border rounded-lg text-blue-600 border-blue-200"
            >
              تمييز جميعها كقراءة
            </button>
            <button
              onClick={handleDeleteAll}
              className="flex-1 px-3 py-2 text-sm border rounded-lg text-red-600 border-red-200"
            >
              حذف جميعها
            </button>
          </div>
        ) : (
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
            className="w-full px-4 py-2 text-sm border rounded-lg text-green-600 border-green-200"
          >
            إرسال إشعار تجريبي
          </button>
        )}
      </div>
    </>
  );

  // زر الجرس
  const BellButton = (
    <button
      ref={buttonRef}
      onClick={handleToggleModal}
      className={`relative p-3 rounded-xl transition-all ${
        isOpen ? "text-blue-600 bg-blue-50 ring-2 ring-blue-200" : "text-gray-600 hover:bg-gray-100"
      }`}
      disabled={isLoading}
    >
      🔔
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );

  // Portal
  const PortalUI =
    isOpen &&
    createPortal(
      <>
        <div className="fixed inset-0 z-[9999] bg-black/50" onClick={() => setIsOpen(false)} />
        {isMobile ? (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center p-4">
            <div
              ref={modalRef}
              tabIndex={-1}
              className={`w-full bg-white rounded-t-2xl shadow-2xl border overflow-y-auto outline-none transition-transform duration-300 notification-modal-mobile ${dragOffset > 0 ? 'notification-modal-dragging' : ''}`}
              data-drag-offset={Math.round(dragOffset)}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {PanelContent}
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 z-[10000] pointer-events-none">
            <div
              ref={modalRef}
              tabIndex={-1}
              className="pointer-events-auto fixed top-16 right-4 w-full sm:max-w-md bg-white rounded-2xl shadow-2xl border outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              {PanelContent}
            </div>
          </div>
        )}
      </>,
      document.body
    );

  return (
    <div className="relative">
      {BellButton}
      {PortalUI}
    </div>
  );
};

export default NotificationBell;