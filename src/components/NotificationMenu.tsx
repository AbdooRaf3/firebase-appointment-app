import React from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import NotificationBell from './NotificationBell';

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
  return (
    <div className="relative">
      {/* زر الإشعارات */}
      <button
        onClick={onToggle}
        onKeyDown={(e) => onKeyDown(e, onToggle)}
        className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label="إشعارات"
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />
      </button>
      
      {/* قائمة الإشعارات */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">الإشعارات</h3>
            <NotificationBell />
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;
