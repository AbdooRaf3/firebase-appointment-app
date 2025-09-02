import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Bell, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import NotificationBell from './NotificationBell';

const Header: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { setupPushNotifications, checkNotificationPermission, pushNotificationsEnabled, testNotification, sendPhoneNotification } = useNotificationStore();
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

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'admin':
        return [
          { path: '/admin', label: 'لوحة التحكم', icon: '🏠', ariaLabel: 'الانتقال إلى لوحة التحكم' },
          { path: '/admin/users', label: 'إدارة المستخدمين', icon: '👥', ariaLabel: 'الانتقال إلى إدارة المستخدمين' },
          { path: '/admin/appointments', label: 'إدارة المواعيد', icon: '📅', ariaLabel: 'الانتقال إلى إدارة المواعيد' }
        ];
      case 'mayor':
        return [
          { path: '/mayor', label: 'لوحة الرئيس', icon: '🏛️', ariaLabel: 'الانتقال إلى لوحة الرئيس' },
          { path: '/appointments', label: 'المواعيد', icon: '📅', ariaLabel: 'الانتقال إلى المواعيد' }
        ];
      case 'secretary':
        return [
          { path: '/secretary', label: 'لوحة السكرتير', icon: '📝', ariaLabel: 'الانتقال إلى لوحة السكرتير' },
          { path: '/appointments/new', label: 'موعد جديد', icon: '➕', ariaLabel: 'إنشاء موعد جديد' },
          { path: '/appointments', label: 'المواعيد', icon: '📅', ariaLabel: 'الانتقال إلى المواعيد' }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 ios-status-bar" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* الشعار */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-2 space-x-reverse focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg p-1"
              aria-label="العودة إلى الصفحة الرئيسية"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg font-bold" aria-hidden="true">م</span>
              </div>
              <span className="text-xl font-bold text-gray-900">مواعيد رئيس البلدية</span>
            </Link>
          </div>

          {/* القائمة الرئيسية - للشاشات الكبيرة */}
          <nav className="hidden md:flex items-center space-x-8 space-x-reverse" role="navigation" aria-label="القائمة الرئيسية">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  location.pathname === item.path
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                aria-label={item.ariaLabel}
                aria-current={location.pathname === item.path ? 'page' : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* الأزرار الجانبية */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* جرس الإشعارات */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  onKeyDown={(e) => handleKeyDown(e, () => setIsNotificationsOpen(!isNotificationsOpen))}
                  className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label="إشعارات"
                  aria-expanded={isNotificationsOpen.toString()}
                  aria-haspopup="true"
                >
                  <Bell className="w-5 h-5" />
                </button>
                
                {/* قائمة الإشعارات */}
                {isNotificationsOpen && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">الإشعارات</h3>
                      <NotificationBell />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* زر تفعيل إشعارات المتصفح */}
            {user && (
              <button
                onClick={async () => {
                  try {
                    if (pushNotificationsEnabled) {
                      console.log('الإشعارات مفعلة بالفعل');
                    } else {
                      await setupPushNotifications();
                    }
                  } catch (error) {
                    console.error('فشل في تفعيل إشعارات المتصفح:', error);
                  }
                }}
                onKeyDown={(e) => handleKeyDown(e, async () => {
                  try {
                    if (!pushNotificationsEnabled) {
                      await setupPushNotifications();
                    }
                  } catch (error) {
                    console.error('فشل في تفعيل إشعارات المتصفح:', error);
                  }
                })}
                className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  pushNotificationsEnabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={pushNotificationsEnabled ? 'إشعارات المتصفح مفعلة' : 'تفعيل إشعارات المتصفح'}
                aria-label={pushNotificationsEnabled ? 'إشعارات المتصفح مفعلة' : 'تفعيل إشعارات المتصفح'}
              >
                <span className="text-sm" aria-hidden="true">
                  {pushNotificationsEnabled ? '🔔' : '🔕'}
                </span>
              </button>
            )}

            {/* معلومات المستخدم */}
            {user && (
              <div className="hidden sm:flex items-center space-x-3 space-x-reverse">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 text-sm font-medium" aria-hidden="true">
                    {user.displayName.charAt(0)}
                  </span>
                </div>
              </div>
            )}

            {/* زر تسجيل الخروج */}
            {user && (
              <button
                onClick={handleSignOut}
                onKeyDown={(e) => handleKeyDown(e, handleSignOut)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}

            {/* زر القائمة للشاشات الصغيرة */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              onKeyDown={(e) => handleKeyDown(e, () => setIsMenuOpen(!isMenuOpen))}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="فتح القائمة"
                             aria-expanded={isMenuOpen.toString()}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* القائمة المنسدلة للشاشات الصغيرة */}
        {isMenuOpen && (
          <div 
            id="mobile-menu"
            className="md:hidden border-t border-gray-200 py-4 ios-safe-area"
            role="navigation"
            aria-label="القائمة الرئيسية للهواتف"
          >
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg text-base font-medium transition-colors touch-target focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    location.pathname === item.path
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-label={item.ariaLabel}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                >
                  <span className="text-lg" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* معلومات المستخدم للشاشات الصغيرة */}
            {user && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3 space-x-reverse px-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 text-lg font-medium" aria-hidden="true">
                      {user.displayName.charAt(0)}
                    </span>
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-base font-medium text-gray-900">{user.displayName}</p>
                    <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                  </div>
                </div>
                
                {/* زر تسجيل الخروج للهواتف */}
                <button
                  onClick={handleSignOut}
                  onKeyDown={(e) => handleKeyDown(e, handleSignOut)}
                  className="w-full mt-4 mx-4 flex items-center justify-center space-x-2 space-x-reverse px-4 py-3 bg-red-50 text-red-700 rounded-lg font-medium transition-colors touch-target hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
