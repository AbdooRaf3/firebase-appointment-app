import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase/firebaseClient';
import { useAuthStore } from './store/authStore';
import { useNotificationStore } from './store/notificationStore';
import { enableFirestorePersistence } from './firebase/enablePersistence';
import Header from './components/Header';
import ToastContainer from './components/Toast';
import IOSOptimizations from './components/IOSOptimizations';

// Lazy Loading للمكونات لتحسين الأداء
const Login = lazy(() => import('./pages/Login'));
const UsersManagement = lazy(() => import('./pages/AdminDashboard/UsersManagement'));
const AppointmentsManagement = lazy(() => import('./pages/AdminDashboard/AppointmentsManagement'));
const Analytics = lazy(() => import('./pages/AdminDashboard/Analytics'));
const SystemSettings = lazy(() => import('./pages/AdminDashboard/SystemSettings'));
const SystemMonitoring = lazy(() => import('./pages/AdminDashboard/SystemMonitoring'));
const AuditLog = lazy(() => import('./pages/AdminDashboard/AuditLog'));
const MayorDashboard = lazy(() => import('./pages/MayorDashboard'));
const SecretaryDashboard = lazy(() => import('./pages/SecretaryDashboard'));
const NewAppointment = lazy(() => import('./pages/Appointments/NewAppointment'));
const AppointmentDetail = lazy(() => import('./pages/Appointments/AppointmentDetail'));
const AppointmentsList = lazy(() => import('./pages/Appointments/AppointmentsList'));
const UserProfile = lazy(() => import('./pages/UserProfile'));

// مكون التحميل المحسن
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">جاري التحميل...</p>
      <div className="mt-2 text-xs text-gray-500">يرجى الانتظار...</div>
    </div>
  </div>
);

// مكون الحماية للمسارات مع Suspense
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {children}
    </Suspense>
  );
};

// مكون لوحة المدير المحسنة
const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    todayAppointments: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // تحميل إحصائيات المستخدمين
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const totalUsers = usersSnapshot.size;
      
      // تحميل إحصائيات المواعيد
      const appointmentsRef = collection(db, 'appointments');
      const appointmentsSnapshot = await getDocs(appointmentsRef);
      const appointments = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        when: doc.data().when.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        status: doc.data().status,
        createdByUid: doc.data().createdByUid
      }));
      
      const totalAppointments = appointments.length;
      const pendingAppointments = appointments.filter(app => app.status === 'pending').length;
      const completedAppointments = appointments.filter(app => app.status === 'done').length;
      
      // مواعيد اليوم
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayAppointments = appointments.filter(app => {
        const appDate = new Date(app.when);
        return appDate >= today && appDate < tomorrow;
      }).length;
      
      // المستخدمين النشطين (الذين أنشأوا مواعيد في آخر 7 أيام)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const activeUserIds = new Set(
        appointments
          .filter(app => app.createdAt >= weekAgo)
          .map(app => app.createdByUid)
      );
      
      setStats({
        totalUsers,
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        todayAppointments,
        activeUsers: activeUserIds.size
      });
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'إدارة المستخدمين',
      description: 'إضافة وتعديل وحذف المستخدمين وتعيين الأدوار',
      icon: '👥',
      color: 'blue',
      path: '/admin/users',
      count: stats.totalUsers
    },
    {
      title: 'إدارة المواعيد',
      description: 'عرض وإدارة جميع المواعيد في النظام',
      icon: '📅',
      color: 'green',
      path: '/admin/appointments',
      count: stats.totalAppointments
    },
    {
      title: 'التحليلات والتقارير',
      description: 'عرض التقارير والإحصائيات التفصيلية',
      icon: '📊',
      color: 'purple',
      path: '/admin/analytics',
      count: null
    },
    {
      title: 'إعدادات النظام',
      description: 'إدارة إعدادات النظام والأمان',
      icon: '⚙️',
      color: 'gray',
      path: '/admin/settings',
      count: null
    },
    {
      title: 'مراقبة النظام',
      description: 'مراقبة أداء النظام وحالة الخدمات',
      icon: '📊',
      color: 'indigo',
      path: '/admin/monitoring',
      count: null
    },
    {
      title: 'سجل المراجعة',
      description: 'تتبع جميع العمليات والأحداث في النظام',
      icon: '📋',
      color: 'teal',
      path: '/admin/audit-log',
      count: null
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      gray: 'bg-gray-50 border-gray-200 text-gray-700',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      teal: 'bg-teal-50 border-teal-200 text-teal-700'
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* العنوان والترحيب */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">لوحة تحكم المدير</h1>
          <p className="text-gray-600 mt-2">مرحباً بك {user.displayName}، إليك نظرة عامة على النظام</p>
        </div>

        {/* الإحصائيات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-lg">👥</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg">📅</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">إجمالي المواعيد</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 text-lg">⏳</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">في الانتظار</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 text-lg">✅</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">مكتملة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 text-lg">📆</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">مواعيد اليوم</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-lg">🔥</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">مستخدمين نشطين</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* الإجراءات السريعة */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">الإجراءات السريعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow p-6 border border-gray-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => navigate(action.path)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">{action.icon}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{action.title}</h3>
                      {action.count !== null && (
                        <span className="mr-2 px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
                          {action.count}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">{action.description}</p>
                    <div className={`mt-4 p-3 rounded-lg border ${getColorClasses(action.color)}`}>
                      <p className="text-sm font-medium">اضغط للانتقال</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* معلومات النظام */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات النظام</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">حالة النظام</p>
              <p className="text-lg font-semibold text-green-600">🟢 يعمل بشكل طبيعي</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">آخر تحديث</p>
              <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleDateString('ar-SA')}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">إصدار النظام</p>
              <p className="text-lg font-semibold text-gray-900">v2.0.0</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const { initializeAuth, user } = useAuthStore();
  const { setupPushNotifications, listenToImmediateNotifications } = useNotificationStore();

  useEffect(() => {
    // تهيئة المصادقة
    const unsubscribe = initializeAuth();
    
    // تمكين persistence
    enableFirestorePersistence();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [initializeAuth]);

  // تهيئة الإشعارات عند تسجيل الدخول
  useEffect(() => {
    if (user) {
      // تهيئة الإشعارات بعد تأخير قصير للتأكد من اكتمال تسجيل الدخول
      const timer = setTimeout(() => {
        setupPushNotifications().catch(error => {
          console.error('فشل في تهيئة الإشعارات:', error);
        });
        
        // الاستماع للإشعارات الفورية
        listenToImmediateNotifications(user.uid);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, setupPushNotifications, listenToImmediateNotifications]);

  return (
    <IOSOptimizations>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* صفحة تسجيل الدخول */}
            <Route path="/login" element={<Login />} />
            
            {/* لوحة المدير */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* إدارة المستخدمين */}
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <UsersManagement />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* إدارة المواعيد */}
            <Route 
              path="/admin/appointments" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <AppointmentsManagement />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* التحليلات والتقارير */}
            <Route 
              path="/admin/analytics" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <Analytics />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* إعدادات النظام */}
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <SystemSettings />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* مراقبة النظام */}
            <Route 
              path="/admin/monitoring" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <SystemMonitoring />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* سجل المراجعة */}
            <Route 
              path="/admin/audit-log" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <AuditLog />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* لوحة رئيس البلدية */}
            <Route 
              path="/mayor" 
              element={
                <ProtectedRoute allowedRoles={['mayor']}>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <MayorDashboard />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* لوحة السكرتير */}
            <Route 
              path="/secretary" 
              element={
                <ProtectedRoute allowedRoles={['secretary']}>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <SecretaryDashboard />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* إنشاء موعد جديد */}
            <Route 
              path="/appointments/new" 
              element={
                <ProtectedRoute allowedRoles={['secretary', 'admin']}>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <NewAppointment />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* عرض جميع المواعيد */}
            <Route 
              path="/appointments" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <AppointmentsList />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* تفاصيل الموعد */}
            <Route 
              path="/appointments/:id" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <AppointmentDetail />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* الصفحة الرئيسية - إعادة توجيه حسب الدور */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              } 
            />
            
            {/* الملف الشخصي */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <UserProfile />
                    </main>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* لوحة المعلومات - إعادة توجيه حسب الدور */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              } 
            />
          </Routes>
          
          {/* مكون الإشعارات */}
          <ToastContainer />
        </div>
      </Router>
    </IOSOptimizations>
  );
};

// مكون إعادة التوجيه حسب الدور
const DashboardRedirect: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      switch (user.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'mayor':
          navigate('/mayor', { replace: true });
          break;
        case 'secretary':
          navigate('/secretary', { replace: true });
          break;
        default:
          navigate('/login', { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">جاري التوجيه...</p>
      </div>
    </div>
  );
};

export default App;
