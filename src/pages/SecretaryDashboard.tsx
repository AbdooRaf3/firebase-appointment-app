import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';
import { Appointment, User } from '../types';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useNotificationStore } from '../store/notificationStore';
import AppointmentCard from '../components/AppointmentCard';
import ConfirmDialog from '../components/ConfirmDialog';
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
    }, (_error) => {
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
      // const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // ساعة من الآن
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

  const getPastCount = () => {
    const now = new Date();
    return appointments.filter(app => app.when < now).length;
  };

  const getCancelledCount = () => {
    return appointments.filter(app => app.status === 'cancelled').length;
  };

  const generateCalendar = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // الحصول على أول يوم من الشهر
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // الحصول على عدد الأيام في الشهر
    const daysInMonth = lastDay.getDate();
    
    // الحصول على يوم الأسبوع لأول يوم (0 = الأحد)
    const startDay = firstDay.getDay();
    
    const calendar = [];
    
    // إضافة الأيام الفارغة في بداية الشهر
    for (let i = 0; i < startDay; i++) {
      calendar.push(null);
    }
    
    // إضافة أيام الشهر
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayAppointments = appointments.filter(app => {
        const appDate = new Date(app.when.getFullYear(), app.when.getMonth(), app.when.getDate());
        const dayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return appDate.getTime() === dayDate.getTime();
      });
      
      calendar.push({
        date,
        day,
        appointments: dayAppointments,
        isToday: date.toDateString() === now.toDateString()
      });
    }
    
    return calendar;
  };

  const renderCalendar = () => {
    const calendar = generateCalendar();
    const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendar.map((day, index) => (
            <div
              key={index}
              className={`min-h-[80px] p-1 border border-gray-100 ${
                day?.isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'
              } ${!day ? 'bg-gray-50' : ''}`}
            >
              {day && (
                <>
                  <div className={`text-sm font-medium mb-1 ${
                    day.isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {day.day}
                  </div>
                  <div className="space-y-1">
                    {day.appointments.slice(0, 2).map((appointment, appIndex) => (
                      <div
                        key={appIndex}
                        className={`text-xs p-1 rounded truncate ${
                          appointment.status === 'done' 
                            ? 'bg-green-100 text-green-800'
                            : appointment.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                        title={appointment.title}
                      >
                        {appointment.title}
                      </div>
                    ))}
                    {day.appointments.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{day.appointments.length - 2} أكثر
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const exportToCSV = () => {
    const csvContent = [
      ['العنوان', 'الوصف', 'التاريخ', 'الوقت', 'الحالة', 'أنشأ بواسطة', 'مخصص لـ'],
      ...filteredAppointments.map(appointment => [
        appointment.title,
        appointment.description,
        appointment.when.toLocaleDateString('ar-SA'),
        appointment.when.toLocaleTimeString('ar-SA'),
        appointment.status === 'done' ? 'مكتمل' : appointment.status === 'cancelled' ? 'ملغي' : 'في الانتظار',
        getUserById(appointment.createdByUid)?.displayName || 'غير محدد',
        getUserById(appointment.assignedToUid)?.displayName || 'غير محدد'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `مواعيد_${new Date().toLocaleDateString('ar-SA')}.csv`);
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
        <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${appointment.when.toLocaleDateString('ar-SA')}</p>
        <p style="margin: 5px 0;"><strong>الوقت:</strong> ${appointment.when.toLocaleTimeString('ar-SA')}</p>
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
            <p class="date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>
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
    <div className="space-y-6">
      {/* شريط التنقل */}
      <nav className="bg-white rounded-lg shadow border border-gray-200 p-4">
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
                 location.pathname === '/appointments/new' 
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
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">مرحباً، {user?.displayName}</h1>
            <p className="text-green-100">لوحة السكرتير - إدارة المواعيد والجدول الزمني</p>
          </div>
          
          <div className="mt-4 lg:mt-0 flex flex-wrap gap-2">
                         <button
               onClick={() => navigate('/appointments/new')}
               className="px-4 py-2 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center space-x-2 space-x-reverse"
             >
               <span>إنشاء موعد جديد</span>
             </button>
             <button
               onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
               className="px-4 py-2 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center space-x-2 space-x-reverse"
             >
               <span>{viewMode === 'list' ? 'عرض التقويم' : 'عرض القائمة'}</span>
             </button>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
             <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
         <div className="flex items-center justify-between mb-4">
           <h3 className="text-lg font-medium text-gray-900">إحصائيات سريعة</h3>
           <div className="flex items-center space-x-2 space-x-reverse">
             <button
               onClick={() => setDateFilter('all')}
               className="text-sm text-primary-600 hover:text-primary-700 underline"
             >
               عرض جميع المواعيد
             </button>
           </div>
         </div>
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDateFilter('all')}>
             <div className="flex items-center">
               <div className="mr-4">
               <p className="text-sm font-medium text-gray-600">إجمالي المواعيد</p>
               <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
             </div>
           </div>
         </div>
         
         <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('pending')}>
           <div className="flex items-center">
             <div className="mr-4">
               <p className="text-sm font-medium text-gray-600">في الانتظار</p>
               <p className="text-2xl font-bold text-gray-900">{getStatusCount('pending')}</p>
             </div>
           </div>
         </div>
         
         <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('done')}>
           <div className="flex items-center">
             <div className="mr-4">
               <p className="text-sm font-medium text-gray-600">مكتمل</p>
               <p className="text-2xl font-bold text-gray-900">{getStatusCount('done')}</p>
             </div>
           </div>
         </div>
         
         <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDateFilter('today')}>
           <div className="flex items-center">
             <div className="mr-4">
               <p className="text-sm font-medium text-gray-600">اليوم</p>
               <p className="text-2xl font-bold text-gray-900">{getTodayCount()}</p>
             </div>
           </div>
         </div>
       </div>
       </div>

             {/* إحصائيات إضافية */}
       <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
         <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDateFilter('upcoming')}>
           <div className="flex items-center">
             <div className="mr-4">
               <p className="text-sm font-medium text-gray-600">قادمة</p>
               <p className="text-2xl font-bold text-gray-900">{getUpcomingCount()}</p>
             </div>
           </div>
         </div>
         
         <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDateFilter('past')}>
           <div className="flex items-center">
             <div className="mr-4">
               <p className="text-sm font-medium text-gray-600">ماضية</p>
               <p className="text-2xl font-bold text-gray-900">{getPastCount()}</p>
             </div>
           </div>
         </div>
         
         <div className="bg-white rounded-lg shadow p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('cancelled')}>
           <div className="flex items-center">
             <div className="mr-4">
               <p className="text-sm font-medium text-gray-600">ملغية</p>
               <p className="text-2xl font-bold text-gray-900">{getCancelledCount()}</p>
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
              onClick={() => setDateFilter('upcoming')}
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

      {/* شريط الأدوات */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4 space-x-reverse">
          <Link
            to="/appointments/new"
            className="btn-primary"
          >
            موعد جديد
          </Link>
        </div>
        
                 <div className="flex items-center space-x-2 space-x-reverse">
           <button
             onClick={() => setViewMode('list')}
             className={`p-2 rounded-lg transition-colors ${
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
             className={`p-2 rounded-lg transition-colors ${
               viewMode === 'calendar' 
                 ? 'bg-primary-100 text-primary-600' 
                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
             }`}
             title="عرض التقويم"
           >
             تقويم
           </button>
           
           <div className="w-px h-6 bg-gray-300 mx-2"></div>
           
           <button
             onClick={exportToCSV}
             className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
             title="تصدير إلى CSV"
           >
             تصدير
           </button>
           <button
             onClick={printAppointments}
             className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
             title="طباعة المواعيد"
           >
             طباعة
           </button>
         </div>
      </div>

      {/* تصفية المواعيد */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
              dateFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            جميع المواعيد ({appointments.length})
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
              dateFilter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            اليوم ({getTodayCount()})
          </button>
          <button
            onClick={() => setDateFilter('upcoming')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
              dateFilter === 'upcoming'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            قادمة ({getUpcomingCount()})
          </button>
          <button
            onClick={() => setDateFilter('past')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
              dateFilter === 'past'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ماضية ({getPastCount()})
          </button>
        </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {/* البحث */}
           <div className="relative">
             <input
               type="text"
               placeholder="البحث في المواعيد..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="form-input"
             />
           </div>
           
           {/* تصفية الحالة */}
           <div className="relative">
             <select
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="form-input"
               title="تصفية حسب الحالة"
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
                 className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                 title="تصدير إلى CSV"
               >
                 تصدير
               </button>
             )}
           </div>
        </div>
        
        {viewMode === 'calendar' ? (
          renderCalendar()
        ) : (
          <div className="space-y-4">
                         {filteredAppointments.length === 0 ? (
               <div className="text-center py-12">
                 <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مواعيد</h3>
                 <p className="mt-1 text-sm text-gray-500">
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
