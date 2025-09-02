import React from 'react';
import { Appointment } from '../types';

type AppointmentsFiltersProps = {
  appointments: Appointment[];
  searchTerm: string;
  statusFilter: string;
  dateFilter: 'all' | 'today' | 'upcoming' | 'past';
  onSearchChange: (term: string) => void;
  onStatusFilterChange: (status: string) => void;
  onDateFilterChange: (filter: 'all' | 'today' | 'upcoming' | 'past') => void;
};

const AppointmentsFilters: React.FC<AppointmentsFiltersProps> = ({
  appointments,
  searchTerm,
  statusFilter,
  dateFilter,
  onSearchChange,
  onStatusFilterChange,
  onDateFilterChange
}) => {
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
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => onDateFilterChange('all')}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-target ${
            dateFilter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          جميع المواعيد ({appointments.length})
        </button>
        <button
          onClick={() => onDateFilterChange('today')}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-target ${
            dateFilter === 'today'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          اليوم ({getTodayCount()})
        </button>
        <button
          onClick={() => onDateFilterChange('upcoming')}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-target ${
            dateFilter === 'upcoming'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          قادمة ({getUpcomingCount()})
        </button>
        <button
          onClick={() => onDateFilterChange('past')}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-target ${
            dateFilter === 'past'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ماضية ({getPastCount()})
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* البحث */}
        <div className="relative">
          <input
            type="text"
            placeholder="البحث في المواعيد..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="form-input p-3 text-sm"
          />
        </div>
        
        {/* تصفية الحالة */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="form-input p-3 text-sm"
            title="تصفية حسب الحالة"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">في الانتظار</option>
            <option value="done">مكتمل</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsFilters;
