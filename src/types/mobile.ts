// أنواع المكونات المحسنة للهواتف

export interface MobileOptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isInteractive?: boolean;
}

export interface MobileOptimizedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
}

export interface MobileOptimizedInputProps {
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

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MobileOptimizedSelectProps {
  label?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  icon?: React.ReactNode;
}

export interface IOSOptimizationsProps {
  children: React.ReactNode;
}
