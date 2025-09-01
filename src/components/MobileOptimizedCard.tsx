import React from 'react';
import type { MobileOptimizedCardProps } from '../types/mobile';

const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  children,
  className = '',
  onClick,
  isInteractive = false
}) => {
  const baseClasses = `
    ios-card
    mobile-card
    bg-white
    rounded-lg
    shadow-sm
    border
    border-gray-200
    p-4
    mx-4
    mb-4
    transition-all
    duration-200
    ${isInteractive ? 'cursor-pointer touch-target' : ''}
    ${onClick ? 'hover:shadow-md active:shadow-sm' : ''}
  `;

  const combinedClasses = `${baseClasses} ${className}`.trim();

  if (onClick) {
    return (
      <div
        className={combinedClasses}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick();
          }
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={combinedClasses}>
      {children}
    </div>
  );
};

export default MobileOptimizedCard;
