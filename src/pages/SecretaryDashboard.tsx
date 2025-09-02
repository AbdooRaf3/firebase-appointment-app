import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';
import { Appointment, User } from '../types';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useNotificationStore } from '../store/notificationStore';
import AppointmentCard from '../components/AppointmentCard';
import CalendarView from '../components/CalendarView';
import QuickStats from '../components/QuickStats';
import UpcomingAppointments from '../components/UpcomingAppointments';
import AppointmentsFilters from '../components/AppointmentsFilters';
import ConfirmDialog from '../components/ConfirmDialog';
import BottomNav from '../components/BottomNav';
import FloatingActionButton from '../components/FloatingActionButton';
import { Link, useNavigate, useLocation } from 'react-router-dom';


const SecretaryDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { sendNotification } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [deleteAppointment, setDeleteAppointment] = useState<Appointment | null>(null);
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
      orderBy('when', 'desc'),
      limit(50)
    );
    let unsubscribeActive: (() => void) | null = null;
    const start = () => {
      unsubscribeActive = onSnapshot(q, (snapshot) => {
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
      }, (_error) => {
        addToast({
          type: 'error',
          message: 'فشل في تحميل المواعيد'
        });
        setLoading(false);
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!unsubscribeActive) start();
      } else {
        if (unsubscribeActive) {
          unsubscribeActive();
          unsubscribeActive = null;
        }
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (unsubscribeActive) unsubscribeActive();
    };
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
            message: `موعد قادم: ${appointment.title} في ${appointment.when.toLocaleTimeString('ar-SA-u-ca-gregory')}`
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
      
      // إرسال إشعار لرئيس البلدية عن تغيير حالة الموعد
      const mayorUser = users.find(u => u.uid === appointment.assignedToUid);
      if (mayorUser) {
        await sendNotification({
          userId: appointment.assignedToUid,
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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let filtered = appointments;

    // تصفية حسب التاريخ
    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(app => {
          const appDate = new Date(app.when.getFullYear(), app.when.getMonth(), app.when.getDate());
          return appDate.getTime() === today.getTime();
        });
        break;
      case 'upcoming':
        filtered = filtered.filter(app => app.when > now);
        break;
      case 'past':
        filtered = filtered.filter(app => app.when < now);
        break;
    }

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


  const exportToCSV = () => {
    const csvContent = [
      ['العنوان', 'الوصف', 'التاريخ', 'الوقت', 'الحالة', 'أنشأ بواسطة', 'مخصص لـ'],
      ...filteredAppointments.map(appointment => [
        appointment.title,
        appointment.description,
        appointment.when.toLocaleDateString('ar-SA-u-ca-gregory'),
        appointment.when.toLocaleTimeString('ar-SA-u-ca-gregory'),
        appointment.status === 'done' ? 'مكتمل' : appointment.status === 'cancelled' ? 'ملغي' : 'في الانتظار',
        getUserById(appointment.createdByUid)?.displayName || 'غير محدد',
        getUserById(appointment.assignedToUid)?.displayName || 'غير محدد'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `مواعيد_${new Date().toLocaleDateString('ar-SA-u-ca-gregory')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addToast({
      type: 'success',
      message: 'تم تصدير المواعيد بنجاح'
    });
  };

  const printAppointments = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const appointmentsHTML = filteredAppointments.map(appointment => `
      <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #333;">${appointment.title}</h3>
        <p style="margin: 5px 0; color: #666;">${appointment.description}</p>
        <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${appointment.when.toLocaleDateString('ar-SA-u-ca-gregory')}</p>
        <p style="margin: 5px 0;"><strong>الوقت:</strong> ${appointment.when.toLocaleTimeString('ar-SA-u-ca-gregory')}</p>
        <p style="margin: 5px 0;"><strong>الحالة:</strong> ${appointment.status === 'done' ? 'مكتمل' : appointment.status === 'cancelled' ? 'ملغي' : 'في الانتظار'}</p>
        <p style="margin: 5px 0;"><strong>أنشأ بواسطة:</strong> ${getUserById(appointment.createdByUid)?.displayName || 'غير محدد'}</p>
        <p style="margin: 5px 0;"><strong>مخصص لـ:</strong> ${getUserById(appointment.assignedToUid)?.displayName || 'غير محدد'}</p>
      </div>
    `).join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>مواعيد السكرتير</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .date { color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>مواعيد السكرتير</h1>
            <p class="date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA-u-ca-gregory')}</p>
            <p class="date">عدد المواعيد: ${filteredAppointments.length}</p>
          </div>
          ${appointmentsHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
    
    addToast({
      type: 'success',
      message: 'تم إعداد الطباعة بنجاح'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-gray-900">لوحة السكرتير</h1>
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
              <button onClick={() => setIsNavOpen(false)} className="text-gray-500" aria-label="إغلاق القائمة" title="إغلاق">
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
                onClick={() => { navigate('/appointments/new'); setIsNavOpen(false); }}
                className={`block w-full text-right p-3 rounded-lg ${
                  location.pathname === '/appointments/new' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-end">
                  <span>موعد جديد</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
            <h2 className="text-xl font-semibold text-gray-900">لوحة السكرتير</h2>
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
              onClick={() => navigate('/appointments/new')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/appointments/new' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              موعد جديد
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
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-4 lg:p-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold mb-2">مرحباً، {user?.displayName}</h1>
              <p className="text-green-100 text-sm lg:text-base">لوحة السكرتير - إدارة المواعيد والجدول الزمني</p>
            </div>
            
            <div className="mt-4 lg:mt-0 flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/appointments/new')}
                className="px-4 py-3 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center justify-center space-x-2 space-x-reverse w-full lg:w-auto"
              >
                <span>إنشاء موعد جديد</span>
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                className="px-4 py-3 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center justify-center space-x-2 space-x-reverse w-full lg:w-auto mt-2 lg:mt-0"
              >
                <span>{viewMode === 'list' ? 'عرض التقويم' : 'عرض القائمة'}</span>
              </button>
            </div>
          </div>
        </div>

        <QuickStats 
          appointments={appointments}
          onSetDateFilter={setDateFilter}
          onSetStatusFilter={setStatusFilter}
        />

        <UpcomingAppointments 
          upcomingNotifications={upcomingNotifications}
          onSetDateFilter={setDateFilter}
        />

        {/* شريط الأدوات */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link
              to="/appointments/new"
              className="btn-primary px-4 py-3 text-center w-full sm:w-auto"
            >
              موعد جديد
            </Link>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-lg transition-colors touch-target ${
                viewMode === 'list' 
                  ? 'bg-primary-100 text-primary-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="عرض القائمة"
            >
              قائمة
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-3 rounded-lg transition-colors touch-target ${
                viewMode === 'calendar' 
                  ? 'bg-primary-100 text-primary-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="عرض التقويم"
            >
              تقويم
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-2 hidden sm:block"></div>
            
            <button
              onClick={exportToCSV}
              className="p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors touch-target"
              title="تصدير إلى CSV"
            >
              تصدير
            </button>
            <button
              onClick={printAppointments}
              className="p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors touch-target"
              title="طباعة المواعيد"
            >
              طباعة
            </button>
          </div>
        </div>

        <AppointmentsFilters
          appointments={appointments}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          dateFilter={dateFilter}
          onSearchChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onDateFilterChange={setDateFilter}
        />

        {/* عرض المواعيد */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {viewMode === 'calendar' ? 'تقويم المواعيد' : 'قائمة المواعيد'}
            </h3>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="text-sm text-gray-500">
                {filteredAppointments.length} موعد
              </span>
              {filteredAppointments.length > 0 && (
                <button
                  onClick={exportToCSV}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors touch-target"
                  title="تصدير إلى CSV"
                >
                  تصدير
                </button>
              )}
            </div>
          </div>
          
          {viewMode === 'calendar' ? (
            <CalendarView appointments={appointments} />
          ) : (
            <div className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مواعيد</h3>
                  <p className="mt-1 text-xs text-gray-500 px-4">
                    {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                      ? 'جرب تغيير معايير البحث أو التصفية' 
                      : 'لم تقم بإنشاء أي مواعيد بعد. ابدأ بإنشاء موعد جديد!'
                    }
                  </p>
                  {!searchTerm && statusFilter === 'all' && dateFilter === 'all' && (
                    <Link
                      to="/appointments/new"
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
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
          )}
        </div>
      </div>

      {/* زر عائم لإنشاء موعد جديد بسرعة */}
      <FloatingActionButton
        onClick={() => navigate('/appointments/new')}
        label="موعد جديد"
        ariaLabel="إنشاء موعد جديد"
      />

      <BottomNav
        items={[
          {
            type: 'link',
            path: '/appointments',
            label: 'المواعيد',
            icon: '📅',
            ariaLabel: 'المواعيد',
          },
          {
            type: 'link',
            path: '/appointments/new',
            label: 'جديد',
            icon: '+',
            ariaLabel: 'جديد',
          },
          {
            type: 'action',
            onClick: () => setViewMode(viewMode === 'list' ? 'calendar' : 'list'),
            label: viewMode === 'list' ? 'التقويم' : 'القائمة',
            icon: viewMode === 'list' ? '📅' : '📋',
            ariaLabel: viewMode === 'list' ? 'التقويم' : 'القائمة',
            active: false,
          },
          {
            type: 'link',
            path: '/profile',
            label: 'الملف',
            icon: '👤',
            ariaLabel: 'الملف الشخصي',
          },
        ]}
      />

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