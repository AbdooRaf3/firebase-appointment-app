import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { enableFirestorePersistence } from './firebase/enablePersistence';
import Header from './components/Header';
import ToastContainer from './components/Toast';
import IOSOptimizations from './components/IOSOptimizations';

// Lazy Loading للمكونات لتحسين الأداء
const Login = lazy(() => import('./pages/Login'));
const UsersManagement = lazy(() => import('./pages/AdminDashboard/UsersManagement'));
const AppointmentsManagement = lazy(() => import('./pages/AdminDashboard/AppointmentsManagement'));
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

// مكون لوحة المدير
const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">لوحة تحكم المدير</h1>
          <p className="text-gray-600">مرحباً بك في لوحة إدارة النظام</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/users')}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">إدارة المستخدمين</h2>
            <p className="text-gray-600 mb-4">إضافة وتعديل وحذف المستخدمين وتعيين الأدوار</p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-700 text-sm">اضغط للانتقال إلى إدارة المستخدمين</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/appointments')}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">إدارة المواعيد</h2>
            <p className="text-gray-600 mb-4">عرض وإدارة جميع المواعيد في النظام</p>
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-green-700 text-sm">اضغط للانتقال إلى إدارة المواعيد</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const { initializeAuth } = useAuthStore();

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
