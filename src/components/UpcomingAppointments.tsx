import React from 'react';
import { Appointment } from '../types';

type UpcomingAppointmentsProps = {
  upcomingNotifications: Appointment[];
  onSetDateFilter: (filter: 'upcoming') => void;
};

const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({ 
  upcomingNotifications, 
  onSetDateFilter 
}) => {
  if (upcomingNotifications.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <h3 className="text-sm font-medium text-yellow-800">مواعيد قادمة</h3>
        </div>
        <button
          onClick={() => onSetDateFilter('upcoming')}
          className="text-xs text-yellow-700 hover:text-yellow-800 underline"
        >
          عرض الكل
        </button>
      </div>
      <div className="space-y-2">
        {upcomingNotifications.slice(0, 2).map((appointment) => {
          const timeDiff = appointment.when.getTime() - new Date().getTime();
          const hoursUntil = Math.ceil(timeDiff / (1000 * 60 * 60));
          
          return (
            <div key={appointment.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-yellow-200">
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm truncate">{appointment.title}</p>
                <p className="text-xs text-gray-600">
                  {appointment.when.toLocaleDateString('ar-SA')} - {appointment.when.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right ml-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  hoursUntil <= 1 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {hoursUntil <= 1 ? 'قريباً' : `بعد ${hoursUntil} س`}
                </span>
              </div>
            </div>
          );
        })}
        {upcomingNotifications.length > 2 && (
          <p className="text-xs text-yellow-700 text-center">
            و {upcomingNotifications.length - 2} مواعيد أخرى قادمة
          </p>
        )}
      </div>
    </div>
  );
};

export default UpcomingAppointments;
