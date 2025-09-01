import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import { Appointment, User } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useNotificationStore } from '../../store/notificationStore';
import AppointmentCard from '../../components/AppointmentCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Calendar, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const AppointmentsList: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { sendNotification } = useNotificationStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteAppointment, setDeleteAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!user) return;

    // تحميل المستخدمين
    const loadUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const usersData: User[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          usersData.push({
            uid: doc.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            createdAt: data.createdAt.toDate()
          });
        });
        setUsers(usersData);
      } catch (error) {
        console.error('فشل في تحميل المستخدمين:', error);
      }
    };

    loadUsers();

    // الاستماع للمواعيد
    let q;
    if (user.role === 'secretary') {
      // السكرتير يرى المواعيد التي أنشأها
      q = query(
        collection(db, 'appointments'),
        where('createdByUid', '==', user.uid),
        orderBy('when', 'desc')
      );
    } else if (user.role === 'mayor') {
      // رئيس البلدية يرى المواعيد المخصصة له
      q = query(
        collection(db, 'appointments'),
        where('assignedToUid', '==', user.uid),
        orderBy('when', 'desc')
      );
    } else {
      // المدير يرى جميع المواعيد
      q = query(
        collection(db, 'appointments'),
        orderBy('when', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appointmentsData: Appointment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        appointmentsData.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          when: data.when.toDate(),
          createdAt: data.createdAt.toDate(),
          createdByUid: data.createdByUid,
          assignedToUid: data.assignedToUid,
          status: data.status
        });
      });
      
      setAppointments(appointmentsData);
      setLoading(false);
    }, (error) => {
      console.error('فشل في الاستماع للمواعيد:', error);
      addToast({
        type: 'error',
        message: 'فشل في تحميل المواعيد'
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, addToast]);

  const handleStatusChange = async (appointment: Appointment, newStatus: string) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointment.id!);
      await updateDoc(appointmentRef, { status: newStatus });
      
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

  const handleDelete = async (appointment: Appointment) => {
    try {
      await deleteDoc(doc(db, 'appointments', appointment.id!));
      
      addToast({
        type: 'success',
        message: 'تم حذف الموعد بنجاح'
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في حذف الموعد: ' + error.message
      });
    }
  };

  const getUserById = (uid: string): User | undefined => {
    return users.find(user => user.uid === uid);
  };

  const getFilteredAppointments = () => {
    let filtered = appointments;

    // تصفية حسب الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // تصفية حسب البحث
    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">قائمة المواعيد</h1>
            <p className="text-gray-600 mt-2">عرض وإدارة جميع المواعيد</p>
          </div>
          
          <div className="mt-4 lg:mt-0">
            <Link
              to="/appointments/new"
              className="btn-primary flex items-center space-x-2 space-x-reverse"
            >
              <Plus className="w-4 h-4" />
              <span>موعد جديد</span>
            </Link>
          </div>
        </div>
      </div>

      {/* أدوات التصفية */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            جميع المواعيد ({appointments.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            في الانتظار ({appointments.filter(app => app.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('done')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'done'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            مكتمل ({appointments.filter(app => app.status === 'done').length})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'cancelled'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ملغي ({appointments.filter(app => app.status === 'cancelled').length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* البحث */}
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="البحث في المواعيد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pr-10"
            />
          </div>
          
          {/* تصفية الحالة */}
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input pr-10"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">في الانتظار</option>
              <option value="done">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>
        </div>
      </div>

      {/* عرض المواعيد */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مواعيد</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'جرب تغيير معايير البحث أو التصفية' 
                : 'لم يتم إنشاء أي مواعيد بعد. ابدأ بإنشاء موعد جديد!'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                to="/appointments/new"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                إنشاء موعد جديد
              </Link>
            )}
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              createdByUser={getUserById(appointment.createdByUid)}
              assignedToUser={getUserById(appointment.assignedToUid)}
              onDelete={setDeleteAppointment}
              onStatusChange={handleStatusChange}
              canEdit={user?.role === 'admin' || appointment.createdByUid === user?.uid}
              canDelete={user?.role === 'admin' || appointment.createdByUid === user?.uid}
              canChangeStatus={user?.role === 'admin' || appointment.createdByUid === user?.uid}
            />
          ))
        )}
      </div>

      {/* حوار تأكيد الحذف */}
      <ConfirmDialog
        isOpen={!!deleteAppointment}
        onClose={() => setDeleteAppointment(null)}
        onConfirm={() => deleteAppointment && handleDelete(deleteAppointment)}
        title="حذف الموعد"
        message={`هل أنت متأكد من حذف الموعد "${deleteAppointment?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};

export default AppointmentsList;
