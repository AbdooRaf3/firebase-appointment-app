import React, { useEffect } from 'react';

interface IOSOptimizationsProps {
  children: React.ReactNode;
}

const IOSOptimizations: React.FC<IOSOptimizationsProps> = ({ children }) => {
  useEffect(() => {
    // تحسينات خاصة بـ iPhone
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // إضافة classes خاصة بـ iOS
      document.documentElement.classList.add('ios-device');
      
      // تحسين التمرير
      document.body.style.webkitOverflowScrolling = 'touch';
      
      // منع التكبير
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
      
      // تحسين الأداء
      document.body.style.webkitTransform = 'translateZ(0)';
      document.body.style.transform = 'translateZ(0)';
      
      // منع التمرير المرن
      document.body.style.overscrollBehavior = 'none';
      
      // تحسين النصوص
      document.body.style.webkitFontSmoothing = 'antialiased';
      document.body.style.mozOsxFontSmoothing = 'grayscale';
      
      // منع التحديد
      document.body.style.webkitUserSelect = 'none';
      document.body.style.userSelect = 'none';
      
      // تحسين التفاعل باللمس
      document.body.style.webkitTapHighlightColor = 'transparent';
      
      // إضافة event listeners خاصة بـ iOS
      const handleTouchStart = (e: TouchEvent) => {
        // تحسين التفاعل باللمس
        if (e.target instanceof HTMLElement) {
          e.target.style.webkitTransform = 'scale(0.98)';
        }
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        // إعادة الحجم الطبيعي
        if (e.target instanceof HTMLElement) {
          e.target.style.webkitTransform = 'scale(1)';
        }
      };
      
      // تطبيق event listeners على جميع العناصر التفاعلية
      const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
      interactiveElements.forEach(element => {
        element.addEventListener('touchstart', handleTouchStart);
        element.addEventListener('touchend', handleTouchEnd);
      });
      
      // تنظيف عند unmount
      return () => {
        document.documentElement.classList.remove('ios-device');
        interactiveElements.forEach(element => {
          element.removeEventListener('touchstart', handleTouchStart);
          element.removeEventListener('touchend', handleTouchEnd);
        });
      };
    }
  }, []);

  return (
    <div className="ios-optimizations">
      {children}
    </div>
  );
};

export default IOSOptimizations;
