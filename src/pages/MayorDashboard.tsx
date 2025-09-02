import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';
import { Appointment, User } from '../types';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useNotificationStore } from '../store/notificationStore';
import AppointmentCard from '../components/AppointmentCard';
import { useNavigate, useLocation } from 'react-router-dom';

const MayorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { sendNotification } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'today' | 'upcoming' | 'done'>('all');
  const [upcomingNotifications, setUpcomingNotifications] = useState<Appointment[]>([]);
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // تحميل المستخدمين
    const loadUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const usersData: User[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          usersData.push({
            uid: d.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
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
      snapshot.forEach((d) => {
        const data = d.data();
        appointmentsData.push({
          id: d.id,
          title: data.title,
          description: data.description,
          when: data.when?.toDate ? data.when.toDate() : data.when,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
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

      // إرسال إشعارات للمواعيد القادمة خلال ساعة (عرض تنبيه/توست)
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
        message: 'فشل في تحديث حالة الموعد'
      });
    }
  };

  const getUserById = (uid: string): User | undefined => {
    return users.find(u => u.uid === uid);
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      {/* شريط التنقل العلوي للهواتف */}
      <div className="lg:hidden bg-white shadow-md p-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="p-2 rounded-lg bg-gray-100 text-gray-700"
            aria-label="فتح القائمة"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">لوحة رئيس البلدية</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* القائمة الجانبية للهواتف - تم تحسينها */}
      {isNavOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsNavOpen(false)} />
          <div className="lg:hidden fixed right-0 top-0 h-full w-72 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">القائمة الرئيسية</h2>
              <button onClick={() => setIsNavOpen(false)} className="text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => { navigate('/appointments'); setIsNavOpen(false); }}
                className={`block w-full text-right p-3 rounded-lg ${
                  location.pathname === '/appointments'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-end">
                  <span>المواعيد</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </button>
              <button
                onClick={() => { navigate('/dashboard'); setIsNavOpen(false); }}
                className={`block w-full text-right p-3 rounded-lg ${
                  location.pathname === '/dashboard'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-end">
                  <span>لوحة التحكم</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </button>
              <button
                onClick={() => { navigate('/profile'); setIsNavOpen(false); }}
                className={`block w-full text-right p-3 rounded-lg ${
                  location.pathname === '/profile'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center justify-end">
                  <span>الملف الشخصي</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </button>
              <button
                onClick={() => { navigate('/logout'); setIsNavOpen(false); }}
                className="block w-full text-right p-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
              >
                <div className="flex items-center justify-end">
                  <span>تسجيل الخروج</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* شريط التنقل للشاشات الكبيرة (مخفي على الهواتف) */}
      <nav className="hidden lg:block bg-white rounded-lg shadow border border-gray-200 p-4 mx-4 mt-4">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <h2 className="text-xl font-semibold text-gray-900">لوحة رئيس البلدية</h2>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={() => navigate('/appointments')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/appointments'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              المواعيد
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/dashboard'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              لوحة التحكم
            </button>
            <button
              onClick={() => navigate('/profile')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/profile'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              الملف الشخصي
            </button>
            <button
              onClick={() => navigate('/logout')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <div className="p-4 space-y-4 lg:space-y-6">
        {/* الترحيب */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-4 lg:p-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold mb-2">مرحباً، {user?.displayName}</h1>
              <p className="text-blue-100 text-sm lg:text-base">لوحة رئيس البلدية - إدارة المواعيد والجدول الزمني</p>
            </div>
            <div className="mt-4 lg:mt-0">
              <button 
                onClick={() => navigate('/appointments')}
                className="bg-white text-blue-700 px-4 py-2 rounded-lg font-medium text-sm lg:text-base hover:bg-blue-50 transition-colors"
              >
                عرض جميع المواعيد
              </button>
            </div>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">إحصائيات سريعة</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div 
              className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setFilter('all')}
            >
              <p className="text-xs font-medium text-gray-600">إجمالي المواعيد</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{appointments.length}</p>
            </div>

            <div 
              className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setFilter('pending')}
            >
              <p className="text-xs font-medium text-gray-600">في الانتظار</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{getStatusCount('pending')}</p>
            </div>

            <div 
              className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setFilter('done')}
            >
              <p className="text-xs font-medium text-gray-600">مكتمل</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{getStatusCount('done')}</p>
            </div>

            <div 
              className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setFilter('today')}
            >
              <p className="text-xs font-medium text-gray-600">اليوم</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{getTodayCount()}</p>
            </div>
          </div>

          {/* إحصائيات إضافية */}
          <div className="grid grid-cols-2 gap-3">
            <div 
              className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => setFilter('upcoming')}
            >
              <p className="text-xs font-medium text-gray-600">قادمة</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{getUpcomingCount()}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-gray-600">ملغية</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{getCancelledCount()}</p>
            </div>
          </div>
        </div>

        {/* إشعارات المواعيد القادمة */}
        {upcomingNotifications.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <h3 className="text-sm font-medium text-yellow-800">مواعيد قادمة</h3>
              </div>
              <button
                onClick={() => setFilter('upcoming')}
                className="text-xs text-yellow-700 hover:text-yellow-800 underline"
              >
                عرض الكل
              </button>
            </div>
            <div className="space-y-2">
              {upcomingNotifications.slice(0, 2).map((appointment) => {
                const timeDiff = appointment.when.getTime() - new Date().getTime();
                const hoursUntil = Math.ceil(timeDiff / (1000 * 60 * 60));

                return (
                  <div key={appointment.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-yellow-200">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{appointment.title}</p>
                      <p className="text-xs text-gray-600">
                        {appointment.when.toLocaleDateString('ar-SA')} - {appointment.when.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        hoursUntil <= 1 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {hoursUntil <= 1 ? 'قريباً' : `بعد ${hoursUntil} س`}
                      </span>
                    </div>
                  </div>
                );
              })}
              {upcomingNotifications.length > 2 && (
                <p className="text-xs text-yellow-700 text-center">
                  و {upcomingNotifications.length - 2} مواعيد أخرى قادمة
                </p>
              )}
            </div>
          </div>
        )}

        {/* تصفية المواعيد */}
        <div className="bg-white rounded-lg shadow p-3 border border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-target ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل ({appointments.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-target ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              في الانتظار ({getStatusCount('pending')})
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-target ${
                filter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              اليوم ({getTodayCount()})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-target ${
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
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg shadow border border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مواعيد</h3>
              <p className="mt-1 text-xs text-gray-500 px-4">
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
                compact={true}
              />
            ))
          )}
        </div>
      </div>

      {/* شريط التنقل السفلي للهواتف - مثبت في الأسفل */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 safe-area-bottom">
        <div className="flex justify-around items-center p-2 h-16">
          <button
            onClick={() => navigate('/appointments')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg w-full ${
              location.pathname === '/appointments' ? 'text-primary-600' : 'text-gray-600'
            }`}
            aria-label="المواعيد"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">المواعيد</span>
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg w-full ${
              location.pathname === '/dashboard' ? 'text-primary-600' : 'text-gray-600'
            }`}
            aria-label="الإحصائيات"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1">الإحصاءات</span>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg w-full ${
              location.pathname === '/profile' ? 'text-primary-600' : 'text-gray-600'
            }`}
            aria-label="الملف الشخصي"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">الملف</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MayorDashboard;