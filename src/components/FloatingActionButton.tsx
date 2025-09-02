import React from 'react';

type FloatingActionButtonProps = {
  onClick: () => void;
  label: string;
  ariaLabel?: string;
};

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick, label, ariaLabel }) => {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel || label}
      title={label}
      className="fixed lg:hidden right-4 z-[60] w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg flex items-center justify-center touch-target"
      style={{ bottom: `calc(env(safe-area-inset-bottom) + 88px)` }}
    >
      <span className="text-2xl" aria-hidden>
        +
      </span>
    </button>
  );
};

export default FloatingActionButton;


