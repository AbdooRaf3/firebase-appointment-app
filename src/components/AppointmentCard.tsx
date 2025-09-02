import React from 'react';
import { Calendar, Clock, User, FileText, Edit, Trash2, CheckCircle, XCircle, Clock as ClockIcon } from 'lucide-react';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      case 'done':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onStatusChange) {
      onStatusChange(appointment, event.target.value);
    }
  };

  const isUpcoming = appointment.when > new Date() && appointment.status === 'pending';
  const isToday = () => {
    const today = new Date();
    const appointmentDate = new Date(appointment.when);
    return today.toDateString() === appointmentDate.toDateString();
  };

  return (
    <div className="card mobile-optimized group animate-fade-in-up">
      {/* شريط الحالة العلوي */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate" title={appointment.title}>
            {appointment.title}
          </h3>
          {isUpcoming && (
            <div className="flex items-center mt-1 text-xs text-blue-600">
              <ClockIcon className="w-3 h-3 mr-1" />
              <span>موعد قادم</span>
            </div>
          )}
          {isToday() && (
            <div className="flex items-center mt-1 text-xs text-green-600">
              <Calendar className="w-3 h-3 mr-1" />
              <span>اليوم</span>
            </div>
          )}
        </div>
        
        {/* شارة الحالة */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <span 
            className={`inline-flex items-center space-x-1 space-x-reverse px-3 py-1 text-xs font-medium rounded-full border-2 ${
              appointment.status === 'pending' ? 'status-pending' :
              appointment.status === 'done' ? 'status-success' :
              appointment.status === 'cancelled' ? 'status-cancelled' :
              'bg-gray-100 border-gray-200 text-gray-800'
            }`}
            role="status"
            aria-label={`حالة الموعد: ${getStatusText(appointment.status)}`}
          >
            {getStatusIcon(appointment.status)}
            <span>{getStatusText(appointment.status)}</span>
          </span>
        </div>
      </div>

      {/* الوصف */}
      {appointment.description && (
        <div className="mb-4">
          <div className="flex items-start space-x-2 space-x-reverse">
            <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600 text-sm leading-relaxed">{appointment.description}</p>
          </div>
        </div>
      )}

      {/* التاريخ والوقت */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 space-x-reverse p-2 bg-gray-50 rounded-lg">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 font-medium">{formatSmartDate(appointment.when)}</span>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse p-2 bg-gray-50 rounded-lg">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 font-medium">{formatTime(appointment.when)}</span>
        </div>
      </div>

      {/* المستخدمين */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 space-x-reverse p-2 bg-blue-50 rounded-lg">
          <User className="w-4 h-4 text-blue-500" />
          <div className="text-sm">
            <span className="text-blue-600 font-medium">أنشأه:</span>
            <span className="text-gray-900 font-medium mr-1 block">
              {createdByUser?.displayName || 'غير محدد'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse p-2 bg-green-50 rounded-lg">
          <User className="w-4 h-4 text-green-500" />
          <div className="text-sm">
            <span className="text-green-600 font-medium">مخصص ل:</span>
            <span className="text-gray-900 font-medium mr-1 block">
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
              className="btn-primary inline-flex items-center space-x-1 space-x-reverse px-3 py-2 text-sm touch-target"
              aria-label={`تعديل الموعد: ${appointment.title}`}
            >
              <Edit className="w-4 h-4" />
              <span>تعديل</span>
            </button>
          )}
          
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(appointment)}
              className="btn-danger inline-flex items-center space-x-1 space-x-reverse px-3 py-2 text-sm touch-target"
              aria-label={`حذف الموعد: ${appointment.title}`}
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف</span>
            </button>
          )}
        </div>

        {/* تغيير الحالة */}
        {canChangeStatus && onStatusChange && (
          <div className="flex flex-col space-y-2">
            <label htmlFor={`status-${appointment.id}`} className="text-xs font-medium text-gray-700">
              تغيير الحالة:
            </label>
            <select
              id={`status-${appointment.id}`}
              value={appointment.status}
              onChange={handleStatusChange}
              className="form-input text-sm touch-target w-full sm:w-auto"
              aria-label={`تغيير حالة الموعد: ${appointment.title}`}
            >
              <option value="pending">في الانتظار</option>
              <option value="done">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>
        )}
      </div>

      {/* مؤشرات إضافية للهواتف */}
      <div className="sm:hidden mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>تم الإنشاء: {appointment.createdAt?.toLocaleDateString('ar-SA-u-ca-gregory')}</span>
          <span>ID: {appointment.id?.slice(-6)}</span>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
