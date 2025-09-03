import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import { Appointment, User } from '../../types';
import { useToastStore } from '../../store/toastStore';

interface AnalyticsData {
  appointmentsByMonth: { month: string; count: number }[];
  appointmentsByStatus: { status: string; count: number; percentage: number }[];
  userActivity: { user: User; appointmentCount: number }[];
  monthlyTrends: { month: string; created: number; completed: number }[];
  averageCompletionTime: number;
  peakHours: { hour: number; count: number }[];
}

const Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    appointmentsByMonth: [],
    appointmentsByStatus: [],
    userActivity: [],
    monthlyTrends: [],
    averageCompletionTime: 0,
    peakHours: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  const { addToast } = useToastStore();

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // تحميل المستخدمين
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const users: User[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          createdAt: data.createdAt.toDate()
        });
      });

      // تحميل المواعيد
      const appointmentsRef = collection(db, 'appointments');
      const appointmentsSnapshot = await getDocs(appointmentsRef);
      const appointments: Appointment[] = [];
      
      appointmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
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

      // حساب الإحصائيات
      const data = calculateAnalytics(appointments, users);
      setAnalyticsData(data);
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحميل البيانات التحليلية: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (appointments: Appointment[], users: User[]): AnalyticsData => {
    const now = new Date();
    const periodStart = getPeriodStart(now, selectedPeriod);
    
    // فلترة المواعيد حسب الفترة المحددة
    const filteredAppointments = appointments.filter(app => app.createdAt >= periodStart);

    // إحصائيات المواعيد حسب الشهر
    const appointmentsByMonth = getAppointmentsByMonth(filteredAppointments);

    // إحصائيات المواعيد حسب الحالة
    const appointmentsByStatus = getAppointmentsByStatus(filteredAppointments);

    // نشاط المستخدمين
    const userActivity = getUserActivity(filteredAppointments, users);

    // الاتجاهات الشهرية
    const monthlyTrends = getMonthlyTrends(filteredAppointments);

    // متوسط وقت الإنجاز
    const averageCompletionTime = getAverageCompletionTime(appointments);

    // ساعات الذروة
    const peakHours = getPeakHours(filteredAppointments);

    return {
      appointmentsByMonth,
      appointmentsByStatus,
      userActivity,
      monthlyTrends,
      averageCompletionTime,
      peakHours
    };
  };

  const getPeriodStart = (now: Date, period: string): Date => {
    const start = new Date(now);
    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return start;
  };

  const getAppointmentsByMonth = (appointments: Appointment[]) => {
    const monthCounts: { [key: string]: number } = {};
    
    appointments.forEach(app => {
      const month = app.createdAt.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const getAppointmentsByStatus = (appointments: Appointment[]) => {
    const statusCounts: { [key: string]: number } = {};
    
    appointments.forEach(app => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    });

    const total = appointments.length;
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  };

  const getUserActivity = (appointments: Appointment[], users: User[]) => {
    const userCounts: { [key: string]: number } = {};
    
    appointments.forEach(app => {
      userCounts[app.createdByUid] = (userCounts[app.createdByUid] || 0) + 1;
    });

    return Object.entries(userCounts)
      .map(([uid, appointmentCount]) => {
        const user = users.find(u => u.uid === uid);
        return { user: user!, appointmentCount };
      })
      .filter(item => item.user)
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, 10);
  };

  const getMonthlyTrends = (appointments: Appointment[]) => {
    const trends: { [key: string]: { created: number; completed: number } } = {};
    
    appointments.forEach(app => {
      const month = app.createdAt.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
      if (!trends[month]) {
        trends[month] = { created: 0, completed: 0 };
      }
      trends[month].created++;
      if (app.status === 'done') {
        trends[month].completed++;
      }
    });

    return Object.entries(trends)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const getAverageCompletionTime = (appointments: Appointment[]) => {
    const completedAppointments = appointments.filter(app => app.status === 'done');
    if (completedAppointments.length === 0) return 0;

    const totalTime = completedAppointments.reduce((sum, app) => {
      const timeDiff = app.when.getTime() - app.createdAt.getTime();
      return sum + timeDiff;
    }, 0);

    return Math.round(totalTime / completedAppointments.length / (1000 * 60 * 60 * 24)); // أيام
  };

  const getPeakHours = (appointments: Appointment[]) => {
    const hourCounts: { [key: number]: number } = {};
    
    appointments.forEach(app => {
      const hour = app.when.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'done': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">التحليلات والتقارير</h1>
          <p className="text-gray-600">إحصائيات مفصلة عن أداء النظام</p>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <label className="text-sm font-medium text-gray-700">الفترة:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="form-input text-sm"
          >
            <option value="week">أسبوع</option>
            <option value="month">شهر</option>
            <option value="quarter">ربع سنة</option>
            <option value="year">سنة</option>
          </select>
        </div>
      </div>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">📊</span>
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">إجمالي المواعيد</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.appointmentsByMonth.reduce((sum, item) => sum + item.count, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">✅</span>
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">معدل الإنجاز</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.appointmentsByStatus.find(s => s.status === 'done')?.percentage || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">⏱️</span>
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">متوسط وقت الإنجاز</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.averageCompletionTime} يوم</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 text-lg">🔥</span>
              </div>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">أكثر المستخدمين نشاطاً</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.userActivity.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* المواعيد حسب الحالة */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع المواعيد حسب الحالة</h3>
        <div className="space-y-3">
          {analyticsData.appointmentsByStatus.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                  {getStatusText(item.status)}
                </span>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <span className="text-sm text-gray-500">{item.count} موعد</span>
                <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* المواعيد حسب الشهر */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">المواعيد حسب الشهر</h3>
        <div className="space-y-3">
          {analyticsData.appointmentsByMonth.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{item.month}</span>
              <div className="flex items-center space-x-4 space-x-reverse">
                <span className="text-sm text-gray-500">{item.count} موعد</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, (item.count / Math.max(...analyticsData.appointmentsByMonth.map(m => m.count))) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* أكثر المستخدمين نشاطاً */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">أكثر المستخدمين نشاطاً</h3>
        <div className="space-y-3">
          {analyticsData.userActivity.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 text-sm font-medium">
                      {item.user.displayName.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-900">{item.user.displayName}</p>
                  <p className="text-xs text-gray-500">{item.user.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <span className="text-sm text-gray-500">{item.appointmentCount} موعد</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, (item.appointmentCount / Math.max(...analyticsData.userActivity.map(u => u.appointmentCount))) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ساعات الذروة */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ساعات الذروة</h3>
        <div className="space-y-3">
          {analyticsData.peakHours.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {item.hour}:00 - {item.hour + 1}:00
              </span>
              <div className="flex items-center space-x-4 space-x-reverse">
                <span className="text-sm text-gray-500">{item.count} موعد</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, (item.count / Math.max(...analyticsData.peakHours.map(h => h.count))) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
