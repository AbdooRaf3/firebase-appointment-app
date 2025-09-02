import React from 'react';
import { useNotificationStore } from '../store/notificationStore';

interface PushNotificationButtonProps {
  onKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

const PushNotificationButton: React.FC<PushNotificationButtonProps> = ({
  onKeyDown
}) => {
  const { setupPushNotifications, pushNotificationsEnabled } = useNotificationStore();

  const handleClick = async () => {
    try {
      if (pushNotificationsEnabled) {
        console.log('الإشعارات مفعلة بالفعل');
      } else {
        await setupPushNotifications();
      }
    } catch (error) {
      console.error('فشل في تفعيل إشعارات المتصفح:', error);
    }
  };

  const handleKeyDownAction = async () => {
    try {
      if (!pushNotificationsEnabled) {
        await setupPushNotifications();
      }
    } catch (error) {
      console.error('فشل في تفعيل إشعارات المتصفح:', error);
    }
  };

  return (
    <button
      onClick={handleClick}
      onKeyDown={(e) => onKeyDown(e, handleKeyDownAction)}
      className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        pushNotificationsEnabled
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={pushNotificationsEnabled ? 'إشعارات المتصفح مفعلة' : 'تفعيل إشعارات المتصفح'}
      aria-label={pushNotificationsEnabled ? 'إشعارات المتصفح مفعلة' : 'تفعيل إشعارات المتصفح'}
    >
      <span className="text-sm" aria-hidden="true">
        {pushNotificationsEnabled ? '🔔' : '🔕'}
      </span>
    </button>
  );
};

export default PushNotificationButton;
