import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { User } from '../types';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSignOut: () => void;
  onKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut,
  onKeyDown
}) => {
  const location = useLocation();

  const getNavItems = () => {
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

  if (!isOpen) return null;

  return (
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
            onClick={onClose}
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
          onClick={onSignOut}
          onKeyDown={(e) => onKeyDown(e, onSignOut)}
          className="w-full mt-4 mx-4 flex items-center justify-center space-x-2 space-x-reverse px-4 py-3 bg-red-50 text-red-700 rounded-lg font-medium transition-colors touch-target hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-label="تسجيل الخروج"
        >
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
};

export default MobileMenu;
