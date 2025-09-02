import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type BottomNavItem = {
  type: 'link' | 'action';
  path?: string;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  ariaLabel?: string;
  active?: boolean;
};

type BottomNavProps = {
  items: BottomNavItem[];
};

const BottomNav: React.FC<BottomNavProps> = ({ items }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="navigation"
      aria-label="شريط التنقل السفلي"
    >
      <div className="flex justify-around items-center p-2 h-16">
        {items.map((item, index) => {
          const isActive = item.active ?? (item.type === 'link' && item.path ? location.pathname === item.path : false);
          const commonClasses = `flex flex-col items-center justify-center p-2 rounded-lg w-full ${
            isActive ? 'text-primary-600' : 'text-gray-600'
          }`;

          if (item.type === 'link' && item.path) {
            return (
              <button
                key={index}
                onClick={() => navigate(item.path!)}
                className={commonClasses}
                aria-label={item.ariaLabel || item.label}
                title={item.label}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={item.onClick}
              className={commonClasses}
              aria-label={item.ariaLabel || item.label}
              title={item.label}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;


