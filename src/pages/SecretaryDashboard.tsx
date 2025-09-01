import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Filter, Clock, CheckCircle } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';
import { Appointment, User } from '../types';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import AppointmentCard from '../components/AppointmentCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { Link } from 'react-router-dom';

const SecretaryDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
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

    // الاستماع للمواعيد التي أنشأها السكرتير
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('createdByUid', '==', user.uid),
      orderBy('when', 'desc')
    );

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

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    return appointments.filter(app => app.status === status).length;
  };

  const getTodayCount = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return appointments.filter(app => {
      const appDate = new Date(app.when.getFullYear(), app.when.getMonth(), app.when.getDate());
      return appDate.getTime() === today.getTime();
    }).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الترحيب */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">مرحباً، {user?.displayName}</h1>
        <p className="text-green-100">لوحة السكرتير - إدارة المواعيد والجدول الزمني</p>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي المواعيد</p>
              <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">في الانتظار</p>
              <p className="text-2xl font-bold text-gray-900">{getStatusCount('pending')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">مكتمل</p>
              <p className="text-2xl font-bold text-gray-900">{getStatusCount('done')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">اليوم</p>
              <p className="text-2xl font-bold text-gray-900">{getTodayCount()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* شريط الأدوات */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4 space-x-reverse">
          <Link
            to="/appointments/new"
            className="btn-primary flex items-center space-x-2 space-x-reverse"
          >
            <Plus className="w-4 h-4" />
            <span>موعد جديد</span>
          </Link>
        </div>
      </div>

      {/* أدوات البحث والتصفية */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
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

      {/* قائمة المواعيد */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مواعيد</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'جرب تغيير معايير البحث' 
                : 'لم تقم بإنشاء أي مواعيد بعد. ابدأ بإنشاء موعد جديد!'
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
              canEdit={true}
              canDelete={true}
              canChangeStatus={true}
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

export default SecretaryDashboard;
