import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';
import { Appointment, User } from '../types';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useNotificationStore } from '../store/notificationStore';
import AppointmentCard from '../components/AppointmentCard';

const MayorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { sendNotification } = useNotificationStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'today' | 'upcoming' | 'done'>('all');
  const [upcomingNotifications, setUpcomingNotifications] = useState<Appointment[]>([]);

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

    // الاستماع للمواعيد المخصصة لرئيس البلدية
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('assignedToUid', '==', user.uid),
      orderBy('when', 'asc')
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

  // التحقق من المواعيد القادمة
  useEffect(() => {
    if (appointments.length === 0) return;

    const checkUpcomingAppointments = () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // غداً

      const upcoming = appointments.filter(appointment => {
        const appointmentTime = appointment.when;
        return (
          appointment.status === 'pending' &&
          appointmentTime > now &&
          appointmentTime <= tomorrow
        );
      });

      setUpcomingNotifications(upcoming);

      // إرسال إشعارات للمواعيد القادمة خلال ساعة
      upcoming.forEach(appointment => {
        const timeDiff = appointment.when.getTime() - now.getTime();
        const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);

        if (hoursUntilAppointment <= 1 && hoursUntilAppointment > 0) {
          addToast({
            type: 'info',
            message: `موعد قادم: ${appointment.title} في ${appointment.when.toLocaleTimeString('ar-SA')}`
          });
        }
      });
    };

    checkUpcomingAppointments();

    // التحقق كل 30 دقيقة
    const interval = setInterval(checkUpcomingAppointments, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [appointments, addToast]);

  const handleStatusChange = async (appointment: Appointment, newStatus: string) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointment.id!);
      await updateDoc(appointmentRef, { status: newStatus });
      
      // إرسال إشعار للسكرتير عن تغيير حالة الموعد
      const secretaryUser = users.find(u => u.uid === appointment.createdByUid);
      if (secretaryUser) {
        await sendNotification({
          userId: appointment.createdByUid,
          title: 'تحديث حالة الموعد',
          message: `تم تحديث حالة الموعد "${appointment.title}" إلى "${newStatus === 'done' ? 'مكتمل' : newStatus === 'cancelled' ? 'ملغي' : 'في الانتظار'}"`,
          type: 'status_changed',
          appointmentId: appointment.id
        });
      }
      
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

  const getUserById = (uid: string): User | undefined => {
    return users.find(user => user.uid === uid);
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (filter) {
      case 'pending':
        return appointments.filter(app => app.status === 'pending');
      case 'today':
        return appointments.filter(app => {
          const appDate = new Date(app.when.getFullYear(), app.when.getMonth(), app.when.getDate());
          return appDate.getTime() === today.getTime();
        });
      case 'upcoming':
        return appointments.filter(app => app.when > now && app.status === 'pending');
      case 'done':
        return appointments.filter(app => app.status === 'done');
      default:
        return appointments;
    }
  };

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

  const getUpcomingCount = () => {
    const now = new Date();
    return appointments.filter(app => app.when > now && app.status === 'pending').length;
  };

  const getCancelledCount = () => {
    return appointments.filter(app => app.status === 'cancelled').length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="space-y-6">
      {/* الترحيب */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">مرحباً، {user?.displayName}</h1>
        <p className="text-blue-100">لوحة رئيس البلدية - إدارة المواعيد والجدول الزمني</p>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stats-grid">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('all')}>
          <div className="flex items-center">
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي المواعيد</p>
              <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('pending')}>
          <div className="flex items-center">
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">في الانتظار</p>
              <p className="text-2xl font-bold text-gray-900">{getStatusCount('pending')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('done')}>
          <div className="flex items-center">
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">مكتمل</p>
              <p className="text-2xl font-bold text-gray-900">{getStatusCount('done')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('today')}>
          <div className="flex items-center">
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">اليوم</p>
              <p className="text-2xl font-bold text-gray-900">{getTodayCount()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* إحصائيات إضافية */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('upcoming')}>
          <div className="flex items-center">
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">قادمة</p>
              <p className="text-2xl font-bold text-gray-900">{getUpcomingCount()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">ملغية</p>
              <p className="text-2xl font-bold text-gray-900">{getStatusCount('cancelled')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">مكتملة</p>
              <p className="text-2xl font-bold text-gray-900">{getStatusCount('done')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* إشعارات المواعيد القادمة */}
      {upcomingNotifications.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-yellow-800">مواعيد قادمة</h3>
            </div>
            <button
              onClick={() => setFilter('upcoming')}
              className="text-sm text-yellow-700 hover:text-yellow-800 underline"
            >
              عرض جميع المواعيد القادمة
            </button>
          </div>
          <div className="space-y-2">
            {upcomingNotifications.slice(0, 3).map((appointment) => {
              const timeDiff = appointment.when.getTime() - new Date().getTime();
              const hoursUntil = Math.ceil(timeDiff / (1000 * 60 * 60));
              
              return (
                <div key={appointment.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-200">
                  <div>
                    <p className="font-medium text-gray-900">{appointment.title}</p>
                    <p className="text-sm text-gray-600">
                      {appointment.when.toLocaleDateString('ar-SA')} في {appointment.when.toLocaleTimeString('ar-SA')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      hoursUntil <= 1 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {hoursUntil <= 1 ? 'قريباً جداً' : `خلال ${hoursUntil} ساعة`}
                    </span>
                  </div>
                </div>
              );
            })}
            {upcomingNotifications.length > 3 && (
              <p className="text-sm text-yellow-700 text-center">
                و {upcomingNotifications.length - 3} مواعيد أخرى قادمة
              </p>
            )}
          </div>
        </div>
      )}

      {/* تصفية المواعيد */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            جميع المواعيد ({appointments.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            في الانتظار ({getStatusCount('pending')})
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
              filter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            اليوم ({getTodayCount()})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
              filter === 'upcoming'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            قادمة ({getUpcomingCount()})
          </button>
        </div>
      </div>

      {/* قائمة المواعيد */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مواعيد</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' 
                ? 'لم يتم تعيين أي مواعيد لك بعد'
                : `لا توجد مواعيد ${filter === 'pending' ? 'في الانتظار' : filter === 'today' ? 'لليوم' : 'قادمة'}`
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
              onStatusChange={handleStatusChange}
              canEdit={false}
              canDelete={false}
              canChangeStatus={true}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MayorDashboard;
