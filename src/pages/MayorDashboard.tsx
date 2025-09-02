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
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'today' | 'upcoming' | 'done'>('all');
  const [upcomingNotifications, setUpcomingNotifications] = useState<Appointment[]>([]);
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('MayorDashboard: Component mounted');
    console.log('MayorDashboard: User state:', user);
  }, []);

  useEffect(() => {
    if (!user) {
      console.log('MayorDashboard: No user, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('MayorDashboard: User authenticated, loading data');

    // تحميل المستخدمين
    const loadUsers = async () => {
      try {
        console.log('MayorDashboard: Loading users...');
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
        console.log('MayorDashboard: Users loaded:', usersData.length);
      } catch (error) {
        console.error('MayorDashboard: Failed to load users:', error);
        setError('فشل في تحميل المستخدمين');
      }
    };

    loadUsers();

    // الاستماع للمواعيد المخصصة لرئيس البلدية
    try {
      console.log('MayorDashboard: Setting up appointments listener...');
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('assignedToUid', '==', user.uid),
        orderBy('when', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('MayorDashboard: Appointments snapshot received:', snapshot.size);
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
        setError(null);
        console.log('MayorDashboard: Appointments loaded:', appointmentsData.length);
      }, (error) => {
        console.error('MayorDashboard: Failed to listen to appointments:', error);
        setError('فشل في تحميل المواعيد');
        setLoading(false);
        addToast({
          type: 'error',
          message: 'فشل في تحميل المواعيد'
        });
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('MayorDashboard: Error setting up appointments listener:', error);
      setError('فشل في إعداد مستمع المواعيد');
      setLoading(false);
    }
  }, [user, addToast, navigate]);

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
      console.error('MayorDashboard: Failed to update appointment status:', error);
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

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">حدث خطأ</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show no user state
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">غير مسجل الدخول</h3>
          <p className="text-gray-600 mb-4">يرجى تسجيل الدخول للوصول إلى لوحة التحكم</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  const filteredAppointments = getFilteredAppointments();

  console.log('MayorDashboard: Rendering dashboard with:', {
    user: user?.displayName,
    appointmentsCount: appointments.length,
    filteredCount: filteredAppointments.length,
    filter
  });

  // نضيف padding bottom يحسب مساحة الشريط + safe area حتى لا يغطي الشريط محتوى الصفحة.
  return (
    <div
      className="space-y-6"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }} // 64px = ارتفاع الشريط (h-16)
    >
      {/* شريط التنقل العلوي للهواتف */}
      <div className="lg:hidden bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="p-2 rounded-lg bg-gray-100 text-gray-700"
            aria-label="فتح القائمة"
          >
            ☰
          </button>
          <h1 className="text-xl font-bold text-gray-900">لوحة رئيس البلدية</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* القائمة الجانبية للهواتف */}
      {isNavOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black bg-opacity-50" onClick={() => setIsNavOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-3/4 bg-white shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">القائمة</h2>
            </div>
            <div className="p-4 space-y-4">
              <button
                onClick={() => { navigate('/appointments'); setIsNavOpen(false); }}
                className={`block w-full text-right p-3 rounded-lg ${
                  location.pathname === '/appointments'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                المواعيد
              </button>
              <button
                onClick={() => { navigate('/dashboard'); setIsNavOpen(false); }}
                className={`block w-full text-right p-3 rounded-lg ${
                  location.pathname === '/dashboard'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                لوحة التحكم
              </button>
              <button
                onClick={() => { navigate('/profile'); setIsNavOpen(false); }}
                className={`block w-full text-right p-3 rounded-lg ${
                  location.pathname === '/profile'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                الملف الشخصي
              </button>
              <button
                onClick={() => { navigate('/logout'); setIsNavOpen(false); }}
                className="block w-full text-right p-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* شريط التنقل للشاشات الكبيرة (مخفي على الهواتف) */}
      <nav className="hidden lg:block bg-white rounded-lg shadow border border-gray-200 p-4">
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

      {/* الترحيب */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">مرحباً، {user?.displayName}</h1>
            <p className="text-blue-100">لوحة رئيس البلدية - إدارة المواعيد والجدول الزمني</p>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">إحصائيات سريعة</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
                <p className="text-2xl font-bold text-gray-900">{getCancelledCount()}</p>
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
            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-target ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            جميع المواعيد ({appointments.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-target ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            في الانتظار ({getStatusCount('pending')})
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-target ${
              filter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            اليوم ({getTodayCount()})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-target ${
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

      {/* شريط التنقل السفلي للهواتف - ثابت دائما في أسفل الشاشة مع safe-area */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="navigation"
        aria-label="شريط التنقل السفلي"
      >
        <div className="flex justify-around items-center p-2 h-16">
          <button
            onClick={() => navigate('/appointments')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg w-full ${
              location.pathname === '/appointments' ? 'text-primary-600' : 'text-gray-600'
            }`}
            aria-label="المواعيد"
          >
            <span className="text-2xl">📅</span>
            <span className="text-xs mt-1">المواعيد</span>
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg w-full ${
              location.pathname === '/dashboard' ? 'text-primary-600' : 'text-gray-600'
            }`}
            aria-label="الإحصائيات"
          >
            <span className="text-2xl">📊</span>
            <span className="text-xs mt-1">الإحصاءات</span>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg w-full ${
              location.pathname === '/profile' ? 'text-primary-600' : 'text-gray-600'
            }`}
            aria-label="الملف الشخصي"
          >
            <span className="text-2xl">👤</span>
            <span className="text-xs mt-1">الملف</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MayorDashboard;