import React from 'react';
import { Calendar, Clock, User, FileText, Edit, Trash2 } from 'lucide-react';
import { Appointment, User as UserType } from '../types';
import { formatSmartDate, formatTime } from '../utils/dateHelpers';

interface AppointmentCardProps {
  appointment: Appointment;
  createdByUser?: UserType;
  assignedToUser?: UserType;
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  onStatusChange?: (appointment: Appointment, newStatus: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canChangeStatus?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  createdByUser,
  assignedToUser,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit = false,
  canDelete = false,
  canChangeStatus = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'done':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onStatusChange) {
      onStatusChange(appointment, event.target.value);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-shadow mobile-optimized">
      {/* العنوان والحالة */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{appointment.title}</h3>
        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(appointment.status)}`}>
          {getStatusText(appointment.status)}
        </span>
      </div>

      {/* الوصف */}
      {appointment.description && (
        <div className="mb-4">
          <div className="flex items-start space-x-2 space-x-reverse">
            <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600 text-sm">{appointment.description}</p>
          </div>
        </div>
      )}

      {/* التاريخ والوقت */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{formatSmartDate(appointment.when)}</span>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{formatTime(appointment.when)}</span>
        </div>
      </div>

      {/* المستخدمين */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <User className="w-4 h-4 text-gray-500" />
          <div className="text-sm">
            <span className="text-gray-500">أنشأه:</span>
            <span className="text-gray-900 font-medium mr-1">
              {createdByUser?.displayName || 'غير محدد'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <User className="w-4 h-4 text-gray-500" />
          <div className="text-sm">
            <span className="text-gray-500">مخصص ل:</span>
            <span className="text-gray-900 font-medium mr-1">
              {assignedToUser?.displayName || 'غير محدد'}
            </span>
          </div>
        </div>
      </div>

      {/* الأزرار */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 gap-3">
        <div className="flex items-center space-x-2 space-x-reverse">
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(appointment)}
              className="inline-flex items-center space-x-1 space-x-reverse px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors touch-target"
            >
              <Edit className="w-4 h-4" />
              <span>تعديل</span>
            </button>
          )}
          
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(appointment)}
              className="inline-flex items-center space-x-1 space-x-reverse px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors touch-target"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف</span>
            </button>
          )}
        </div>

        {/* تغيير الحالة */}
        {canChangeStatus && onStatusChange && (
          <select
            value={appointment.status}
            onChange={handleStatusChange}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target w-full sm:w-auto"
          >
            <option value="pending">في الانتظار</option>
            <option value="done">مكتمل</option>
            <option value="cancelled">ملغي</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;
