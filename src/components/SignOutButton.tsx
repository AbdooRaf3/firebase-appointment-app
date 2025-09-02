import React from 'react';
import { LogOut } from 'lucide-react';

interface SignOutButtonProps {
  onSignOut: () => void;
  onKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

const SignOutButton: React.FC<SignOutButtonProps> = ({
  onSignOut,
  onKeyDown
}) => {
  return (
    <button
      onClick={onSignOut}
      onKeyDown={(e) => onKeyDown(e, onSignOut)}
      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      title="تسجيل الخروج"
      aria-label="تسجيل الخروج"
    >
      <LogOut className="w-5 h-5" />
    </button>
  );
};

export default SignOutButton;
