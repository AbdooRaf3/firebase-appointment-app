import React from 'react';
import { Menu, X } from 'lucide-react';

interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  onKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

const MobileMenuButton: React.FC<MobileMenuButtonProps> = ({
  isOpen,
  onToggle,
  onKeyDown
}) => {
  return (
    <button
      onClick={onToggle}
      onKeyDown={(e) => onKeyDown(e, onToggle)}
      className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      aria-label="فتح القائمة"
      aria-expanded={isOpen ? 'true' : 'false'}
      aria-controls="mobile-menu"
    >
      {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );
};

export default MobileMenuButton;
