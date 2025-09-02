import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  label: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  label,
  ariaLabel,
  icon = <Plus className="w-5 h-5" />,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-lg hover:shadow-xl';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white shadow-lg hover:shadow-xl';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-lg hover:shadow-xl';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-lg hover:shadow-xl';
      default:
        return 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-lg hover:shadow-xl';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-12';
      case 'md':
        return 'w-16 h-16';
      case 'lg':
        return 'w-20 h-20';
      default:
        return 'w-16 h-16';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-5 h-5';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const handleClick = () => {
    setIsPressed(true);
    onClick();
    
    // إعادة تعيين الحالة بعد فترة قصيرة
    setTimeout(() => setIsPressed(false), 150);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* زر الإجراء العائم */}
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        className={`
          ${getVariantClasses()}
          ${getSizeClasses()}
          ${className}
          rounded-full flex items-center justify-center
          transition-all duration-200 ease-in-out
          transform hover:scale-105 active:scale-95
          focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-current
          touch-target
          ${isPressed ? 'scale-95 shadow-md' : ''}
        `}
        aria-label={ariaLabel || label}
        title={label}
        role="button"
        tabIndex={0}
      >
        <div className={`${getIconSize()} transition-transform duration-200 ${isPressed ? 'scale-90' : ''}`}>
          {icon}
        </div>
      </button>

      {/* التلميح */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        {label}
        {/* سهم التلميح */}
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>

      {/* تأثير الموجة عند النقر */}
      {isPressed && (
        <div className="absolute inset-0 rounded-full bg-white bg-opacity-30 animate-ping"></div>
      )}
    </div>
  );
};

// مكون متعدد الأزرار
interface MultiFloatingActionButtonProps {
  mainButton: {
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
  };
  secondaryButtons: Array<{
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
  }>;
  isOpen: boolean;
  onToggle: () => void;
}

export const MultiFloatingActionButton: React.FC<MultiFloatingActionButtonProps> = ({
  mainButton,
  secondaryButtons,
  isOpen,
  onToggle,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* الأزرار الثانوية */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 space-y-3">
          {secondaryButtons.map((button, index) => (
            <div
              key={index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <FloatingActionButton
                onClick={button.onClick}
                label={button.label}
                icon={button.icon}
                variant={button.variant}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* الزر الرئيسي */}
      <button
        onClick={onToggle}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center
          bg-primary-600 hover:bg-primary-700 text-white
          shadow-lg hover:shadow-xl
          transition-all duration-300 ease-in-out
          transform hover:scale-105
          focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-primary-500
          touch-target
        `}
        aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        title={isOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
      >
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
          {isOpen ? <X className="w-6 h-6" /> : mainButton.icon}
        </div>
      </button>
    </div>
  );
};

export default FloatingActionButton;


