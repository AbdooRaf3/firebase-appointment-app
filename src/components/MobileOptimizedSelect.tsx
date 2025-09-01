import React, { useState, useRef, useEffect } from 'react';
import type { MobileOptimizedSelectProps, Option } from '../types/mobile';

const MobileOptimizedSelect: React.FC<MobileOptimizedSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'اختر خياراً',
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(
    options.find(opt => opt.value === value) || null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const option = options.find(opt => opt.value === value);
    setSelectedOption(option || null);
  }, [value, options]);

  const handleSelect = (option: Option) => {
    if (option.disabled) return;
    
    setSelectedOption(option);
    setIsOpen(false);
    if (onChange) {
      onChange(option.value);
    }
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const baseClasses = `
    ios-select
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
    cursor-pointer
    ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
    ${className}
  `;

  return (
    <div className="mobile-form-group" ref={dropdownRef}>
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
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={disabled}
          className={baseClasses}
          style={{ fontSize: '16px' }}
        >
          <div className="flex items-center justify-between">
            <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {isOpen && (
          <div className="ios-dropdown mobile-dropdown-content absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                disabled={option.disabled}
                className={`
                  w-full px-4 py-3 text-right text-sm transition-colors duration-150
                  ${option.disabled 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                  }
                  ${selectedOption?.value === option.value ? 'bg-primary-50 text-primary-700' : ''}
                  ${option.disabled ? '' : 'touch-target'}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
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

export default MobileOptimizedSelect;
