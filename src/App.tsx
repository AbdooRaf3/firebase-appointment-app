import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { enableFirestorePersistence } from './firebase/enablePersistence';
import Header from './components/Header';
import ToastContainer from './components/Toast';
import Login from './pages/Login';
import UsersManagement from './pages/AdminDashboard/UsersManagement';
import AppointmentsManagement from './pages/AdminDashboard/AppointmentsManagement';
import MayorDashboard from './pages/MayorDashboard';
import SecretaryDashboard from './pages/SecretaryDashboard';
import NewAppointment from './pages/Appointments/NewAppointment';
import AppointmentDetail from './pages/Appointments/AppointmentDetail';

// مكون الحماية للمسارات
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// مكون لوحة المدير
const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  
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
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">إدارة المستخدمين</h2>
            <p className="text-gray-600 mb-4">إضافة وتعديل وحذف المستخدمين وتعيين الأدوار</p>
            <UsersManagement />
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">إدارة المواعيد</h2>
            <p className="text-gray-600 mb-4">عرض وإدارة جميع المواعيد في النظام</p>
            <AppointmentsManagement />
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
                  <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                  <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                  <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                  <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                  <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <NewAppointment />
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
                  <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                <Navigate to="/dashboard" replace />
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
  );
};

// مكون إعادة التوجيه حسب الدور
const DashboardRedirect: React.FC = () => {
  const { user } = useAuthStore();
  
  useEffect(() => {
    if (user) {
      switch (user.role) {
        case 'admin':
          window.location.href = '/admin';
          break;
        case 'mayor':
          window.location.href = '/mayor';
          break;
        case 'secretary':
          window.location.href = '/secretary';
          break;
        default:
          window.location.href = '/login';
      }
    }
  }, [user]);

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
