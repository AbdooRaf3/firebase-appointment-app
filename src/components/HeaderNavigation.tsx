import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';

interface HeaderNavigationProps {
  user: User;
}

const HeaderNavigation: React.FC<HeaderNavigationProps> = ({ user }) => {
  const location = useLocation();

  const getNavItems = () => {
    switch (user.role) {
      case 'admin':
        return [
          { path: '/admin', label: 'لوحة التحكم', icon: '🏠', ariaLabel: 'الانتقال إلى لوحة التحكم' },
          { path: '/admin/users', label: 'إدارة المستخدمين', icon: '👥', ariaLabel: 'الانتقال إلى إدارة المستخدمين' },
          { path: '/admin/appointments', label: 'إدارة المواعيد', icon: '📅', ariaLabel: 'الانتقال إلى إدارة المواعيد' },
          { path: '/admin/analytics', label: 'التحليلات', icon: '📊', ariaLabel: 'الانتقال إلى التحليلات والتقارير' },
          { path: '/admin/monitoring', label: 'مراقبة النظام', icon: '📈', ariaLabel: 'الانتقال إلى مراقبة النظام' },
          { path: '/admin/audit-log', label: 'سجل المراجعة', icon: '📋', ariaLabel: 'الانتقال إلى سجل المراجعة' },
          { path: '/admin/settings', label: 'الإعدادات', icon: '⚙️', ariaLabel: 'الانتقال إلى إعدادات النظام' }
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
  );
};

export default HeaderNavigation;
