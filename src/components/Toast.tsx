import React, { useEffect, useState } from 'react';
import { useToastStore } from '../store/toastStore';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const Toast: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toasts.length > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [toasts]);

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!isVisible || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 space-y-2 max-w-sm mx-auto sm:mx-0 sm:left-auto sm:right-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} animate-slide-up`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="flex items-start space-x-3 space-x-reverse">
            {/* الأيقونة */}
            <div className="flex-shrink-0 mt-0.5">
              {getToastIcon(toast.type)}
            </div>
            
            {/* المحتوى */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-5">
                {toast.message}
              </p>
            </div>
            
            {/* زر الإغلاق */}
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current"
              aria-label="إغلاق الإشعار"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* شريط التقدم */}
          <div className="mt-3 w-full bg-current bg-opacity-20 rounded-full h-1">
            <div 
              className="bg-current h-1 rounded-full transition-all duration-300 ease-linear"
              style={{ 
                width: '100%',
                animation: `shrink ${toast.duration || 5000}ms linear forwards`
              }}
            />
          </div>
        </div>
      ))}
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default Toast;
