import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import HeaderLogo from './HeaderLogo';
import HeaderNavigation from './HeaderNavigation';
import HeaderActions from './HeaderActions';
import MobileMenu from './MobileMenu';

const Header: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { checkNotificationPermission } = useNotificationStore();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  // فحص حالة الإشعارات عند تحميل المكون
  React.useEffect(() => {
    if (user) {
      checkNotificationPermission();
    }
  }, [user, checkNotificationPermission]);

  // إغلاق القائمة عند تغيير المسار
  React.useEffect(() => {
    setIsMenuOpen(false);
    setIsNotificationsOpen(false);
  }, [location]);

  // دعم لوحة المفاتيح
  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleToggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleToggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 ios-status-bar" role="banner">
      <a href="#main-content" className="skip-link">تخطي إلى المحتوى</a>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* الشعار */}
          <HeaderLogo />

          {/* القائمة الرئيسية - للشاشات الكبيرة */}
          {user && <HeaderNavigation user={user} />}

          {/* الأزرار الجانبية */}
          {user && (
            <HeaderActions
              user={user}
              isNotificationsOpen={isNotificationsOpen}
              isMenuOpen={isMenuOpen}
              onToggleNotifications={handleToggleNotifications}
              onToggleMenu={handleToggleMenu}
              onSignOut={handleSignOut}
              onKeyDown={handleKeyDown}
            />
          )}
        </div>

        {/* القائمة المنسدلة للشاشات الصغيرة */}
        {user && (
          <MobileMenu
            isOpen={isMenuOpen}
            onClose={handleCloseMenu}
            user={user}
            onSignOut={handleSignOut}
            onKeyDown={handleKeyDown}
          />
        )}
      </div>
    </header>
  );
};

export default Header;
