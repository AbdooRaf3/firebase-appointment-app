import React from 'react';
import { Appointment } from '../types';

type CalendarViewProps = {
  appointments: Appointment[];
};

const CalendarView: React.FC<CalendarViewProps> = ({ appointments }) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = firstDay.getDay();

  const calendar: Array<any> = [];

  for (let i = 0; i < startDay; i++) {
    calendar.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dayAppointments = appointments.filter(app => {
      const appDate = new Date(app.when.getFullYear(), app.when.getMonth(), app.when.getDate());
      const dayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return appDate.getTime() === dayDate.getTime();
    });

    calendar.push({
      date,
      day,
      appointments: dayAppointments,
      isToday: date.toDateString() === now.toDateString()
    });
  }

  const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendar.map((day: any, index: number) => (
          <div
            key={index}
            className={`min-h-[80px] p-1 border border-gray-100 ${
              day?.isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'
            } ${!day ? 'bg-gray-50' : ''}`}
          >
            {day && (
              <>
                <div className={`text-sm font-medium mb-1 ${
                  day.isToday ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {day.day}
                </div>
                <div className="space-y-1">
                  {day.appointments.slice(0, 2).map((appointment: Appointment, appIndex: number) => (
                    <div
                      key={appIndex}
                      className={`text-xs p-1 rounded truncate ${
                        appointment.status === 'done' 
                          ? 'bg-green-100 text-green-800'
                          : appointment.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                      title={appointment.title}
                    >
                      {appointment.title}
                    </div>
                  ))}
                  {day.appointments.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{day.appointments.length - 2} أكثر
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;


