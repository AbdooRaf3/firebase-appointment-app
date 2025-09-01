import React from 'react';
import type { MobileOptimizedButtonProps } from '../types/mobile';

const MobileOptimizedButton: React.FC<MobileOptimizedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  icon
}) => {
  const baseClasses = `
    ios-button
    mobile-button
    font-medium
    rounded-lg
    transition-all
    duration-200
    touch-target
    -webkit-tap-highlight-color-transparent
    focus:outline-none
    focus:ring-2
    focus:ring-offset-2
    disabled:opacity-50
    disabled:cursor-not-allowed
    active:transform
    active:scale-95
  `;

  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
  };

  const sizeClasses = {
    small: 'py-2 px-3 text-sm min-h-[40px]',
    medium: 'py-3 px-4 text-base min-h-[48px]',
    large: 'py-4 px-6 text-lg min-h-[56px]'
  };

  const widthClasses = fullWidth ? 'w-full' : '';

  const combinedClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClasses}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled}
      onTouchStart={(e) => {
        // تحسين التفاعل باللمس
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onTouchEnd={(e) => {
        // إعادة الحجم الطبيعي
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div className="flex items-center justify-center space-x-2 space-x-reverse">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </div>
    </button>
  );
};

export default MobileOptimizedButton;
