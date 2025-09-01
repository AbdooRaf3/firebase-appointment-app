import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import { Appointment, User } from '../../types';
import { useToastStore } from '../../store/toastStore';
import AppointmentCard from '../../components/AppointmentCard';
import ConfirmDialog from '../../components/ConfirmDialog';

const AppointmentsManagement: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteAppointment, setDeleteAppointment] = useState<Appointment | null>(null);
  
  const { addToast } = useToastStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // تحميل المستخدمين
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData: User[] = [];
      usersSnapshot.forEach((doc) => {
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

      // تحميل المواعيد
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, orderBy('when', 'desc'));
      const snapshot = await getDocs(q);
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
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحميل البيانات: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: string) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointment.id!);
      await updateDoc(appointmentRef, { status: newStatus });
      
      addToast({
        type: 'success',
        message: 'تم تحديث حالة الموعد بنجاح'
      });
      
      loadData();
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
      
      loadData();
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إدارة المواعيد</h1>
        <p className="text-gray-600">عرض وإدارة جميع المواعيد في النظام</p>
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
              <Calendar className="w-6 h-6 text-yellow-600" />
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
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">مكتمل</p>
              <p className="text-2xl font-bold text-gray-900">{getStatusCount('done')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">ملغي</p>
              <p className="text-2xl font-bold text-gray-900">{getStatusCount('cancelled')}</p>
            </div>
          </div>
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
                : 'لم يتم إنشاء أي مواعيد بعد'
              }
            </p>
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
              canEdit={false}
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

export default AppointmentsManagement;
