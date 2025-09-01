import React from 'react';

interface MobileOptimizedInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  icon?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
}

const MobileOptimizedInput: React.FC<MobileOptimizedInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  icon,
  onFocus,
  onBlur
}) => {
  const baseClasses = `
    ios-input
    form-input
    w-full
    px-4
    py-3
    border
    rounded-lg
    transition-all
    duration-200
    focus:outline-none
    focus:ring-2
    focus:ring-primary-500
    focus:border-transparent
    disabled:opacity-50
    disabled:cursor-not-allowed
    ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
    ${className}
  `;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="mobile-form-group">
      {label && (
        <label className="form-label flex items-center space-x-2 space-x-reverse">
          {icon && <span className="text-gray-500">{icon}</span>}
          <span>
            {label}
            {required && <span className="text-red-500 mr-1">*</span>}
          </span>
        </label>
      )}
      
      <div className="relative">
        <input
          type={type}
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          onFocus={onFocus}
          onBlur={onBlur}
          className={baseClasses}
          // منع التكبير في iOS
          style={{ fontSize: '16px' }}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center space-x-1 space-x-reverse">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default MobileOptimizedInput;
