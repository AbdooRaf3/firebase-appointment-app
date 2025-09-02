import React from 'react';
import { Appointment } from '../types';

type QuickStatsProps = {
  appointments: Appointment[];
  onSetDateFilter: (filter: 'all' | 'today' | 'upcoming' | 'past') => void;
  onSetStatusFilter: (status: 'all' | 'pending' | 'done' | 'cancelled') => void;
};

const QuickStats: React.FC<QuickStatsProps> = ({ appointments, onSetDateFilter, onSetStatusFilter }) => {
  const getStatusCount = (status: string) => appointments.filter(app => app.status === status).length;

  const getTodayCount = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return appointments.filter(app => {
      const appDate = new Date(app.when.getFullYear(), app.when.getMonth(), app.when.getDate());
      return appDate.getTime() === today.getTime();
    }).length;
  };

  const getUpcomingCount = () => {
    const now = new Date();
    return appointments.filter(app => app.when > now && app.status === 'pending').length;
  };

  const getPastCount = () => {
    const now = new Date();
    return appointments.filter(app => app.when < now).length;
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">إحصائيات سريعة</h3>
        <div className="flex items-center space-x-2 space-x-reverse">
          <button onClick={() => onSetDateFilter('all')} className="text-sm text-primary-600 hover:text-primary-700 underline">
            عرض جميع المواعيد
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSetDateFilter('all')}>
          <p className="text-xs font-medium text-gray-600">إجمالي المواعيد</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{appointments.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSetStatusFilter('pending')}>
          <p className="text-xs font-medium text-gray-600">في الانتظار</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{getStatusCount('pending')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSetStatusFilter('done')}>
          <p className="text-xs font-medium text-gray-600">مكتمل</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{getStatusCount('done')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSetDateFilter('today')}>
          <p className="text-xs font-medium text-gray-600">اليوم</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{getTodayCount()}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSetDateFilter('upcoming')}>
          <p className="text-xs font-medium text-gray-600">قادمة</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{getUpcomingCount()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSetDateFilter('past')}>
          <p className="text-xs font-medium text-gray-600">ماضية</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{getPastCount()}</p>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;


