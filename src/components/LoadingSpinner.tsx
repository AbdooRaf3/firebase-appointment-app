import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  showText?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'جاري التحميل...', 
  showText = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Spinner مع رسوم متحركة محسنة */}
      <div className="relative">
        {/* الدائرة الخارجية */}
        <div className={`${sizeClasses[size]} border-4 border-secondary-200 rounded-full animate-pulse`}></div>
        
        {/* الدائرة الداخلية المتحركة */}
        <div className={`${sizeClasses[size]} border-4 border-primary-500 border-t-transparent rounded-full absolute top-0 left-0 animate-spin`}></div>
        
        {/* نقطة مركزية */}
        <div className={`${size === 'lg' ? 'w-2 h-2' : size === 'md' ? 'w-1.5 h-1.5' : 'w-1 h-1'} bg-primary-500 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse`}></div>
      </div>
      
      {/* النص */}
      {showText && (
        <div className="mt-4 text-center">
          <p className={`${textSizes[size]} font-medium text-gray-700 mb-1`}>
            {text}
          </p>
                  <div className="flex items-center justify-center space-x-1 space-x-reverse">
          <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce loading-dot-1"></div>
          <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce loading-dot-2"></div>
          <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce loading-dot-3"></div>
        </div>
        </div>
      )}
    </div>
  );
};

// مكون Loading للصفحات الكاملة
export const PageLoading: React.FC<{ text?: string }> = ({ text = 'جاري تحميل الصفحة...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <LoadingSpinner size="lg" text={text} />
  </div>
);

// مكون Loading للبطاقات
export const CardLoading: React.FC = () => (
  <div className="card">
    <div className="animate-pulse">
      <div className="h-4 bg-secondary-200 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-secondary-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-secondary-200 rounded w-2/3 mb-4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-secondary-200 rounded"></div>
        <div className="h-3 bg-secondary-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

// مكون Loading للقوائم
export const ListLoading: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <CardLoading key={index} />
    ))}
  </div>
);

export default LoadingSpinner;
