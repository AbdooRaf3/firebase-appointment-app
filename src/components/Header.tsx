import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

const Header: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { enabled, requestPermission } = useNotificationStore();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

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
    <header className="bg-white shadow-sm border-b border-gray-200">
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
            {/* زر الإشعارات */}
            {user && (
              <button
                onClick={requestPermission}
                className={`p-2 rounded-lg transition-colors ${
                  enabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={enabled ? 'الإشعارات مفعلة' : 'تفعيل الإشعارات'}
              >
                <span className="text-sm">
                  {enabled ? '🔔' : '🔕'}
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
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-3 space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
