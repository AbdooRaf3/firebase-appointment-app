import React from 'react';
import { Link } from 'react-router-dom';

const HeaderLogo: React.FC = () => {
  return (
    <div className="flex items-center">
      <Link 
        to="/" 
        className="logo-brand focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg p-1"
        aria-label="العودة إلى الصفحة الرئيسية"
      >
        <div className="logo-icon">
          <span className="text-white text-lg font-bold" aria-hidden="true">م</span>
        </div>
        <span className="logo-text">مواعيد رئيس البلدية</span>
      </Link>
    </div>
  );
};

export default HeaderLogo;
