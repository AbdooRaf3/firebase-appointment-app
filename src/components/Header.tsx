import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import NotificationBell from './NotificationBell';

const Header: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { setupPushNotifications, checkNotificationPermission, pushNotificationsEnabled, testNotification } = useNotificationStore();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // فحص حالة الإشعارات عند تحميل المكون
  React.useEffect(() => {
    if (user) {
      checkNotificationPermission();
    }
  }, [user, checkNotificationPermission]);

  const handleSignOut = async () => {
    await signOut();
  };

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'admin':
        return [
          { path: '/admin', label: 'لوحة التحكم', icon: '🏠' },
          { path: '/admin/users', label: 'إدارة المستخدمين', icon: '👥' },
          { path: '/admin/appointments', label: 'إدارة المواعيد', icon: '📅' }
        ];
      case 'mayor':
        return [
          { path: '/mayor', label: 'لوحة الرئيس', icon: '🏛️' },
          { path: '/appointments', label: 'المواعيد', icon: '📅' }
        ];
      case 'secretary':
        return [
          { path: '/secretary', label: 'لوحة السكرتير', icon: '📝' },
          { path: '/appointments/new', label: 'موعد جديد', icon: '➕' },
          { path: '/appointments', label: 'المواعيد', icon: '📅' }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 ios-status-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* الشعار */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 space-x-reverse">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg font-bold">م</span>
              </div>
              <span className="text-xl font-bold text-gray-900">مواعيد رئيس البلدية</span>
            </Link>
          </div>

          {/* القائمة الرئيسية - للشاشات الكبيرة */}
          <nav className="hidden md:flex items-center space-x-8 space-x-reverse">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* الأزرار الجانبية */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* جرس الإشعارات */}
            {user && <NotificationBell />}

            {/* زر تفعيل إشعارات المتصفح */}
            {user && (
              <button
                onClick={async () => {
                  try {
                    if (pushNotificationsEnabled) {
                      // إذا كانت مفعلة، اعرض رسالة
                      console.log('الإشعارات مفعلة بالفعل');
                    } else {
                      // إذا لم تكن مفعلة، قم بتفعيلها
                      await setupPushNotifications();
                    }
                  } catch (error) {
                    console.error('فشل في تفعيل إشعارات المتصفح:', error);
                  }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  pushNotificationsEnabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={pushNotificationsEnabled ? 'إشعارات المتصفح مفعلة' : 'تفعيل إشعارات المتصفح'}
              >
                <span className="text-sm">
                  {pushNotificationsEnabled ? '🔔' : '🔕'}
                </span>
              </button>
            )}

            {/* زر اختبار الإشعارات */}
            {user && pushNotificationsEnabled && (
              <button
                onClick={() => testNotification()}
                className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                title="اختبار الإشعارات"
              >
                <span className="text-sm">🧪</span>
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
                  <span className="text-primary-700 text-sm font-medium">
                    {user.displayName.charAt(0)}
                  </span>
                </div>
              </div>
            )}

            {/* زر تسجيل الخروج */}
            {user && (
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}

            {/* زر القائمة للشاشات الصغيرة */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* القائمة المنسدلة للشاشات الصغيرة */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 ios-safe-area">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg text-base font-medium transition-colors touch-target ${
                    location.pathname === item.path
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* معلومات المستخدم للشاشات الصغيرة */}
            {user && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3 space-x-reverse px-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 text-lg font-medium">
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
                  className="w-full mt-4 mx-4 flex items-center justify-center space-x-2 space-x-reverse px-4 py-3 bg-red-50 text-red-700 rounded-lg font-medium transition-colors touch-target hover:bg-red-100"
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
