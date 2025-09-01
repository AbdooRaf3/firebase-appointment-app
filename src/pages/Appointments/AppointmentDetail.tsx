import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, User, Edit, Trash2, ArrowRight } from 'lucide-react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import { Appointment, User as UserType } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { formatSmartDate, formatTime, getTimeAgo } from '../../utils/dateHelpers';
import ConfirmDialog from '../../components/ConfirmDialog';

const AppointmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [createdByUser, setCreatedByUser] = useState<UserType | null>(null);
  const [assignedToUser, setAssignedToUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    when: '',
    status: ''
  });

  useEffect(() => {
    if (id) {
      loadAppointment();
    }
  }, [id]);

  const loadAppointment = async () => {
    try {
      setLoading(true);
      
      if (!id) return;

      const appointmentRef = doc(db, 'appointments', id);
      const appointmentSnap = await getDoc(appointmentRef);
      
      if (!appointmentSnap.exists()) {
        addToast({
          type: 'error',
          message: 'الموعد غير موجود'
        });
        navigate('/');
        return;
      }

      const data = appointmentSnap.data();
      const appointmentData: Appointment = {
        id: appointmentSnap.id,
        title: data.title,
        description: data.description,
        when: data.when.toDate(),
        createdAt: data.createdAt.toDate(),
        createdByUid: data.createdByUid,
        assignedToUid: data.assignedToUid,
        status: data.status
      };

      setAppointment(appointmentData);
      setEditFormData({
        title: appointmentData.title,
        description: appointmentData.description,
        when: appointmentData.when.toISOString().slice(0, 16),
        status: appointmentData.status
      });

      // تحميل بيانات المستخدمين
      await loadUsers(appointmentData.createdByUid, appointmentData.assignedToUid);
      
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحميل الموعد: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (createdByUid: string, assignedToUid: string) => {
    try {
      // تحميل بيانات منشئ الموعد
      const createdByRef = doc(db, 'users', createdByUid);
      const createdBySnap = await getDoc(createdByRef);
      if (createdBySnap.exists()) {
        const data = createdBySnap.data();
        setCreatedByUser({
          uid: createdBySnap.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          createdAt: data.createdAt.toDate()
        });
      }

      // تحميل بيانات رئيس البلدية المخصص له
      const assignedToRef = doc(db, 'users', assignedToUid);
      const assignedToSnap = await getDoc(assignedToRef);
      if (assignedToSnap.exists()) {
        const data = assignedToSnap.data();
        setAssignedToUser({
          uid: assignedToSnap.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          createdAt: data.createdAt.toDate()
        });
      }
    } catch (error) {
      console.error('فشل في تحميل بيانات المستخدمين:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!appointment || !id) return;

    try {
      const appointmentRef = doc(db, 'appointments', id);
      await updateDoc(appointmentRef, { status: newStatus });
      
      setAppointment(prev => prev ? { ...prev, status: newStatus as any } : null);
      
      addToast({
        type: 'success',
        message: 'تم تحديث حالة الموعد بنجاح'
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحديث حالة الموعد: ' + error.message
      });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointment || !id) return;

    try {
      const appointmentRef = doc(db, 'appointments', id);
      const updates: any = {};
      
      if (editFormData.title !== appointment.title) {
        updates.title = editFormData.title;
      }
      if (editFormData.description !== appointment.description) {
        updates.description = editFormData.description;
      }
      if (editFormData.when !== appointment.when.toISOString().slice(0, 16)) {
        updates.when = new Date(editFormData.when);
      }
      if (editFormData.status !== appointment.status) {
        updates.status = editFormData.status;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(appointmentRef, updates);
        
        setAppointment(prev => prev ? { ...prev, ...updates } : null);
        
        addToast({
          type: 'success',
          message: 'تم تحديث الموعد بنجاح'
        });
        
        setShowEditForm(false);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحديث الموعد: ' + error.message
      });
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteDoc(doc(db, 'appointments', id));
      
      addToast({
        type: 'success',
        message: 'تم حذف الموعد بنجاح'
      });
      
      // العودة إلى الصفحة السابقة
      navigate(-1);
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في حذف الموعد: ' + error.message
      });
    }
  };

  const canEdit = user && (
    user.role === 'admin' || 
    user.role === 'secretary' || 
    (user.role === 'mayor' && user.uid === appointment?.assignedToUid)
  );

  const canDelete = user && (
    user.role === 'admin' || 
    user.role === 'secretary'
  );

  const canChangeStatus = user && (
    user.role === 'admin' || 
    user.role === 'secretary' || 
    user.role === 'mayor'
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">الموعد غير موجود</h2>
        <p className="text-gray-600 mt-2">الموعد الذي تبحث عنه غير موجود أو تم حذفه</p>
        <Link to="/" className="btn-primary mt-4">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* شريط التنقل */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة
        </button>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          {canEdit && (
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="btn-secondary flex items-center space-x-2 space-x-reverse"
            >
              <Edit className="w-4 h-4" />
              <span>تعديل</span>
            </button>
          )}
          
          {canDelete && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="btn-danger flex items-center space-x-2 space-x-reverse"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف</span>
            </button>
          )}
        </div>
      </div>

      {/* تفاصيل الموعد */}
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{appointment.title}</h1>
            <p className="text-gray-600 mt-2">
              تم إنشاؤه {getTimeAgo(appointment.createdAt)}
            </p>
          </div>
          
          <span className={`px-4 py-2 text-sm font-medium rounded-full border ${getStatusColor(appointment.status)}`}>
            {getStatusText(appointment.status)}
          </span>
        </div>

        {/* الوصف */}
        {appointment.description && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">الوصف</h3>
            <p className="text-gray-700">{appointment.description}</p>
          </div>
        )}

        {/* المعلومات الأساسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-500">التاريخ والوقت</p>
                <p className="text-gray-900">{formatSmartDate(appointment.when)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 space-x-reverse">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-500">الوقت</p>
                <p className="text-gray-900">{formatTime(appointment.when)}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-500">أنشأه</p>
                <p className="text-gray-900">{createdByUser?.displayName || 'غير محدد'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 space-x-reverse">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-500">مخصص ل</p>
                <p className="text-gray-900">{assignedToUser?.displayName || 'غير محدد'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* تغيير الحالة */}
        {canChangeStatus && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">تغيير الحالة</h3>
            <select
              value={appointment.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="form-input w-auto"
            >
              <option value="pending">في الانتظار</option>
              <option value="done">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>
        )}
      </div>

      {/* نموذج التعديل */}
      {showEditForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">تعديل الموعد</h3>
          
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="form-label">العنوان</label>
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="form-input"
                required
              />
            </div>
            
            <div>
              <label className="form-label">الوصف</label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="form-input"
                rows={3}
              />
            </div>
            
            <div>
              <label className="form-label">التاريخ والوقت</label>
              <input
                type="datetime-local"
                value={editFormData.when}
                onChange={(e) => setEditFormData({ ...editFormData, when: e.target.value })}
                className="form-input"
                required
              />
            </div>
            
            <div>
              <label className="form-label">الحالة</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                className="form-input"
              >
                <option value="pending">في الانتظار</option>
                <option value="done">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
            
            <div className="flex items-center justify-end space-x-3 space-x-reverse pt-4">
              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                حفظ التغييرات
              </button>
            </div>
          </form>
        </div>
      )}

      {/* حوار تأكيد الحذف */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="حذف الموعد"
        message={`هل أنت متأكد من حذف الموعد "${appointment.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};

export default AppointmentDetail;
