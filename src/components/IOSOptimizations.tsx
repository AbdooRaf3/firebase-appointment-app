import React, { useEffect } from 'react';
import type { IOSOptimizationsProps } from '../types/mobile';

const IOSOptimizations: React.FC<IOSOptimizationsProps> = ({ children }) => {
  useEffect(() => {
    // تحسينات خاصة بـ iPhone
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // إضافة classes خاصة بـ iOS
      document.documentElement.classList.add('ios-device');
      
      // تحسين التمرير
      (document.body.style as any)['-webkit-overflow-scrolling'] = 'touch';
      
      // منع التكبير
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
      
      // تحسين الأداء
      (document.body.style as any)['-webkit-transform'] = 'translateZ(0)';
      document.body.style.transform = 'translateZ(0)';
      
      // منع التمرير المرن
      document.body.style.overscrollBehavior = 'none';
      
      // تحسين النصوص
      (document.body.style as any)['-webkit-font-smoothing'] = 'antialiased';
      (document.body.style as any)['-moz-osx-font-smoothing'] = 'grayscale';
      
      // منع التحديد
      (document.body.style as any)['-webkit-user-select'] = 'none';
      document.body.style.userSelect = 'none';
      
      // تحسين التفاعل باللمس
      (document.body.style as any)['-webkit-tap-highlight-color'] = 'transparent';
      
      // إضافة event listeners خاصة بـ iOS
      const handleTouchStart = (e: Event) => {
        // تحسين التفاعل باللمس
        if (e.target instanceof HTMLElement) {
          (e.target.style as any)['-webkit-transform'] = 'scale(0.98)';
        }
      };
      
      const handleTouchEnd = (e: Event) => {
        // إعادة الحجم الطبيعي
        if (e.target instanceof HTMLElement) {
          (e.target.style as any)['-webkit-transform'] = 'scale(1)';
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
