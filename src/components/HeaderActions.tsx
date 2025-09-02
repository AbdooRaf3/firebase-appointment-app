import React from 'react';
import { User } from '../types';
import NotificationMenu from './NotificationMenu';
import PushNotificationButton from './PushNotificationButton';
import UserProfile from './UserProfile';
import SignOutButton from './SignOutButton';
import MobileMenuButton from './MobileMenuButton';

interface HeaderActionsProps {
  user: User;
  isNotificationsOpen: boolean;
  isMenuOpen: boolean;
  onToggleNotifications: () => void;
  onToggleMenu: () => void;
  onSignOut: () => void;
  onKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({
  user,
  isNotificationsOpen,
  isMenuOpen,
  onToggleNotifications,
  onToggleMenu,
  onSignOut,
  onKeyDown
}) => {
  return (
    <div className="flex items-center space-x-4 space-x-reverse">
      {/* جرس الإشعارات */}
      <NotificationMenu
        isOpen={isNotificationsOpen}
        onToggle={onToggleNotifications}
        onKeyDown={onKeyDown}
      />

      {/* زر تفعيل إشعارات المتصفح */}
      <PushNotificationButton onKeyDown={onKeyDown} />

      {/* معلومات المستخدم */}
      <UserProfile user={user} />

      {/* زر تسجيل الخروج */}
      <SignOutButton onSignOut={onSignOut} onKeyDown={onKeyDown} />

      {/* زر القائمة للشاشات الصغيرة */}
      <MobileMenuButton
        isOpen={isMenuOpen}
        onToggle={onToggleMenu}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};

export default HeaderActions;
