import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import { useToastStore } from '../../store/toastStore';

interface SystemMetrics {
  // استخدام التخزين
  storageUsage: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  
  // نشاط المستخدمين
  userActivity: {
    onlineUsers: number;
    activeToday: number;
    newUsersThisWeek: number;
    totalSessions: number;
  };
  
  // أداء النظام
  systemPerformance: {
    responseTime: number;
    uptime: number;
    errorRate: number;
    throughput: number;
  };
  
  // حالة الخدمات
  servicesStatus: {
    database: 'online' | 'offline' | 'degraded';
    authentication: 'online' | 'offline' | 'degraded';
    notifications: 'online' | 'offline' | 'degraded';
    storage: 'online' | 'offline' | 'degraded';
  };
  
  // الأحداث الأخيرة
  recentEvents: {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    timestamp: Date;
    user?: string;
  }[];
}

const SystemMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    storageUsage: { total: 100, used: 45, available: 55, percentage: 45 },
    userActivity: { onlineUsers: 0, activeToday: 0, newUsersThisWeek: 0, totalSessions: 0 },
    systemPerformance: { responseTime: 0, uptime: 0, errorRate: 0, throughput: 0 },
    servicesStatus: {
      database: 'online',
      authentication: 'online',
      notifications: 'online',
      storage: 'online'
    },
    recentEvents: []
  });
  
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // ثواني
  
  const { addToast } = useToastStore();

  useEffect(() => {
    loadSystemMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(loadSystemMetrics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadSystemMetrics = async () => {
    try {
      setLoading(true);
      
      // تحميل بيانات المستخدمين
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const totalUsers = usersSnapshot.size;
      
      // تحميل المواعيد
      const appointmentsRef = collection(db, 'appointments');
      const appointmentsSnapshot = await getDocs(appointmentsRef);
      const totalAppointments = appointmentsSnapshot.size;
      
      // حساب المستخدمين النشطين اليوم
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const activeToday = appointmentsSnapshot.docs.filter(doc => {
        const createdAt = doc.data().createdAt.toDate();
        return createdAt >= today && createdAt < tomorrow;
      }).length;
      
      // حساب المستخدمين الجدد هذا الأسبوع
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newUsersThisWeek = usersSnapshot.docs.filter(doc => {
        const createdAt = doc.data().createdAt.toDate();
        return createdAt >= weekAgo;
      }).length;
      
      // محاكاة بيانات الأداء (في التطبيق الحقيقي، هذه ستأتي من نظام مراقبة)
      const systemPerformance = {
        responseTime: Math.random() * 200 + 50, // 50-250ms
        uptime: 99.9 + Math.random() * 0.1, // 99.9-100%
        errorRate: Math.random() * 0.5, // 0-0.5%
        throughput: Math.random() * 1000 + 500 // 500-1500 requests/min
      };
      
      // محاكاة حالة الخدمات
      const servicesStatus = {
        database: Math.random() > 0.1 ? 'online' : 'degraded',
        authentication: Math.random() > 0.05 ? 'online' : 'degraded',
        notifications: Math.random() > 0.15 ? 'online' : 'degraded',
        storage: Math.random() > 0.08 ? 'online' : 'degraded'
      } as any;
      
      // محاكاة الأحداث الأخيرة
      const recentEvents = [
        {
          id: '1',
          type: 'info' as const,
          message: 'تم إنشاء موعد جديد',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          user: 'أحمد محمد'
        },
        {
          id: '2',
          type: 'success' as const,
          message: 'تم تحديث النظام بنجاح',
          timestamp: new Date(Date.now() - 15 * 60 * 1000)
        },
        {
          id: '3',
          type: 'warning' as const,
          message: 'استخدام التخزين مرتفع',
          timestamp: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          id: '4',
          type: 'info' as const,
          message: 'مستخدم جديد انضم للنظام',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          user: 'سارة أحمد'
        }
      ];
      
      setMetrics({
        storageUsage: { total: 100, used: 45, available: 55, percentage: 45 },
        userActivity: {
          onlineUsers: Math.floor(Math.random() * 20) + 5,
          activeToday,
          newUsersThisWeek,
          totalSessions: Math.floor(Math.random() * 1000) + 500
        },
        systemPerformance,
        servicesStatus,
        recentEvents
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحميل بيانات المراقبة: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'متصل';
      case 'degraded': return 'محدود';
      case 'offline': return 'غير متصل';
      default: return 'غير معروف';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📝';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'info': return 'border-blue-200 bg-blue-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
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
      {/* العنوان والتحكم */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مراقبة النظام</h1>
          <p className="text-gray-600">مراقبة أداء النظام وحالة الخدمات</p>
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="autoRefresh" className="mr-2 text-sm text-gray-700">
              تحديث تلقائي
            </label>
          </div>
          
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="form-input text-sm"
            disabled={!autoRefresh}
          >
            <option value={10}>10 ثواني</option>
            <option value={30}>30 ثانية</option>
            <option value={60}>دقيقة</option>
            <option value={300}>5 دقائق</option>
          </select>
          
          <button
            onClick={loadSystemMetrics}
            className="btn-primary text-sm"
          >
            تحديث الآن
          </button>
        </div>
      </div>

      {/* حالة الخدمات */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">حالة الخدمات</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(metrics.servicesStatus).map(([service, status]) => (
            <div key={service} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {service === 'database' ? 'قاعدة البيانات' :
                   service === 'authentication' ? 'المصادقة' :
                   service === 'notifications' ? 'الإشعارات' :
                   service === 'storage' ? 'التخزين' : service}
                </p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                  {getStatusText(status)}
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                status === 'online' ? 'bg-green-500' :
                status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* إحصائيات الأداء */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">⚡</span>
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">وقت الاستجابة</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(metrics.systemPerformance.responseTime)}ms
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">📈</span>
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">وقت التشغيل</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.systemPerformance.uptime.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-lg">⚠️</span>
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">معدل الأخطاء</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.systemPerformance.errorRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">🚀</span>
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">الإنتاجية</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(metrics.systemPerformance.throughput)}/دقيقة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* نشاط المستخدمين */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">نشاط المستخدمين</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-500">مستخدمين متصلين</p>
            <p className="text-2xl font-bold text-blue-600">{metrics.userActivity.onlineUsers}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-500">نشط اليوم</p>
            <p className="text-2xl font-bold text-green-600">{metrics.userActivity.activeToday}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-500">جدد هذا الأسبوع</p>
            <p className="text-2xl font-bold text-purple-600">{metrics.userActivity.newUsersThisWeek}</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-500">إجمالي الجلسات</p>
            <p className="text-2xl font-bold text-orange-600">{metrics.userActivity.totalSessions}</p>
          </div>
        </div>
      </div>

      {/* استخدام التخزين */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">استخدام التخزين</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">المستخدم</span>
            <span className="text-sm text-gray-500">
              {metrics.storageUsage.used}GB من {metrics.storageUsage.total}GB
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${metrics.storageUsage.percentage}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>متاح: {metrics.storageUsage.available}GB</span>
            <span>{metrics.storageUsage.percentage}% مستخدم</span>
          </div>
        </div>
      </div>

      {/* الأحداث الأخيرة */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">الأحداث الأخيرة</h3>
        <div className="space-y-3">
          {metrics.recentEvents.map((event) => (
            <div key={event.id} className={`flex items-start p-3 border rounded-lg ${getEventColor(event.type)}`}>
              <span className="text-lg mr-3">{getEventIcon(event.type)}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{event.message}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {event.timestamp.toLocaleString('ar-SA')}
                  </span>
                  {event.user && (
                    <span className="text-xs text-gray-500">بواسطة: {event.user}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoring;
