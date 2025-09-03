import React, { useState } from 'react';
import { useNotificationStore } from '../store/notificationStore';

interface PushNotificationButtonProps {
  onKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

const PushNotificationButton: React.FC<PushNotificationButtonProps> = ({
  onKeyDown
}) => {
  const { setupPushNotifications, pushNotificationsEnabled, diagnoseFCM } = useNotificationStore();
  const [showDiagnostic, setShowDiagnostic] = useState(false);

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

  const handleDiagnostic = async () => {
    try {
      await diagnoseFCM();
    } catch (error) {
      console.error('فشل في تشخيص FCM:', error);
    }
  };

  const toggleDiagnostic = () => {
    setShowDiagnostic(!showDiagnostic);
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
    <div className="relative">
      <button
        onClick={handleClick}
        onDoubleClick={toggleDiagnostic}
        onKeyDown={(e) => onKeyDown(e, handleKeyDownAction)}
        className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          pushNotificationsEnabled
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={pushNotificationsEnabled ? 'إشعارات المتصفح مفعلة - انقر مرتين للتشخيص' : 'تفعيل إشعارات المتصفح - انقر مرتين للتشخيص'}
        aria-label={pushNotificationsEnabled ? 'إشعارات المتصفح مفعلة' : 'تفعيل إشعارات المتصفح'}
      >
        <span className="text-sm" aria-hidden="true">
          {pushNotificationsEnabled ? '🔔' : '🔕'}
        </span>
      </button>

      {showDiagnostic && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-48">
          <div className="text-xs text-gray-600 mb-2">أدوات التشخيص</div>
          <button
            onClick={handleDiagnostic}
            className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded transition-colors"
          >
            🔍 تشخيص FCM
          </button>
          <div className="text-xs text-gray-500 mt-2">
            اضغط F12 لرؤية النتائج في وحدة التحكم
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotificationButton;
