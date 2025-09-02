import React from 'react';
import { User } from '../types';

interface UserProfileProps {
  user: User;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div className="hidden sm:flex items-center space-x-3 space-x-reverse">
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
      </div>
      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
        <span className="text-primary-700 text-sm font-medium" aria-hidden="true">
          {user.displayName.charAt(0)}
        </span>
      </div>
    </div>
  );
};

export default UserProfile;
