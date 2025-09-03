import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import { useToastStore } from '../../store/toastStore';

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  timestamp: Date;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'warning';
}

const AuditLog: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: 'all',
    resource: 'all',
    user: 'all',
    status: 'all',
    dateRange: '7days'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const { addToast } = useToastStore();

  useEffect(() => {
    loadAuditLogs();
  }, [filters, currentPage]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      
      // في التطبيق الحقيقي، هذه البيانات ستأتي من مجموعة audit_logs في Firestore
      // هنا سنقوم بمحاكاة البيانات
      const mockAuditLogs: AuditLogEntry[] = [
        {
          id: '1',
          action: 'CREATE',
          resource: 'appointment',
          resourceId: 'apt_001',
          userId: 'user_001',
          userEmail: 'ahmed@example.com',
          userRole: 'secretary',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          details: { title: 'موعد مع العميل أحمد' },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          status: 'success'
        },
        {
          id: '2',
          action: 'UPDATE',
          resource: 'user',
          resourceId: 'user_002',
          userId: 'user_001',
          userEmail: 'admin@example.com',
          userRole: 'admin',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          details: { role: 'secretary', previousRole: 'user' },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0...',
          status: 'success'
        },
        {
          id: '3',
          action: 'DELETE',
          resource: 'appointment',
          resourceId: 'apt_002',
          userId: 'user_003',
          userEmail: 'mayor@example.com',
          userRole: 'mayor',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          details: { title: 'موعد ملغي' },
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0...',
          status: 'success'
        },
        {
          id: '4',
          action: 'LOGIN',
          resource: 'auth',
          resourceId: 'session_001',
          userId: 'user_004',
          userEmail: 'secretary@example.com',
          userRole: 'secretary',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          details: { method: 'email' },
          ipAddress: '192.168.1.103',
          userAgent: 'Mozilla/5.0...',
          status: 'success'
        },
        {
          id: '5',
          action: 'LOGIN',
          resource: 'auth',
          resourceId: 'session_002',
          userId: 'unknown',
          userEmail: 'hacker@example.com',
          userRole: 'unknown',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          details: { method: 'email', reason: 'Invalid password' },
          ipAddress: '192.168.1.999',
          userAgent: 'Mozilla/5.0...',
          status: 'failed'
        },
        {
          id: '6',
          action: 'UPDATE',
          resource: 'system_settings',
          resourceId: 'settings_001',
          userId: 'user_001',
          userEmail: 'admin@example.com',
          userRole: 'admin',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          details: { setting: 'maintenance_mode', value: true },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0...',
          status: 'success'
        },
        {
          id: '7',
          action: 'EXPORT',
          resource: 'users',
          resourceId: 'export_001',
          userId: 'user_001',
          userEmail: 'admin@example.com',
          userRole: 'admin',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
          details: { format: 'csv', recordCount: 25 },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0...',
          status: 'success'
        },
        {
          id: '8',
          action: 'BULK_DELETE',
          resource: 'appointments',
          resourceId: 'bulk_001',
          userId: 'user_001',
          userEmail: 'admin@example.com',
          userRole: 'admin',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          details: { count: 5, reason: 'cleanup' },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0...',
          status: 'success'
        }
      ];
      
      // تطبيق الفلاتر
      let filteredLogs = mockAuditLogs;
      
      if (filters.action !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      
      if (filters.resource !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
      }
      
      if (filters.user !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.user);
      }
      
      if (filters.status !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.status === filters.status);
      }
      
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const days = parseInt(filters.dateRange.replace('days', ''));
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filteredLogs = filteredLogs.filter(log => log.timestamp >= cutoffDate);
      }
      
      // تطبيق البحث
      if (searchTerm) {
        filteredLogs = filteredLogs.filter(log =>
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.details?.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setAuditLogs(filteredLogs);
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحميل سجل المراجعة: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionText = (action: string) => {
    const actions = {
      'CREATE': 'إنشاء',
      'UPDATE': 'تحديث',
      'DELETE': 'حذف',
      'LOGIN': 'تسجيل دخول',
      'LOGOUT': 'تسجيل خروج',
      'EXPORT': 'تصدير',
      'IMPORT': 'استيراد',
      'BULK_DELETE': 'حذف مجمع',
      'BULK_UPDATE': 'تحديث مجمع'
    };
    return actions[action as keyof typeof actions] || action;
  };

  const getResourceText = (resource: string) => {
    const resources = {
      'appointment': 'موعد',
      'user': 'مستخدم',
      'auth': 'مصادقة',
      'system_settings': 'إعدادات النظام',
      'users': 'المستخدمين',
      'appointments': 'المواعيد'
    };
    return resources[resource as keyof typeof resources] || resource;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'نجح';
      case 'failed': return 'فشل';
      case 'warning': return 'تحذير';
      default: return status;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      case 'LOGIN': return '🔐';
      case 'LOGOUT': return '🚪';
      case 'EXPORT': return '📤';
      case 'IMPORT': return '📥';
      case 'BULK_DELETE': return '🗑️';
      case 'BULK_UPDATE': return '✏️';
      default: return '📝';
    }
  };

  const exportAuditLog = () => {
    const csvContent = [
      ['التاريخ', 'الإجراء', 'المورد', 'المستخدم', 'الحالة', 'التفاصيل'],
      ...auditLogs.map(log => [
        log.timestamp.toLocaleString('ar-SA'),
        getActionText(log.action),
        getResourceText(log.resource),
        log.userEmail,
        getStatusText(log.status),
        JSON.stringify(log.details)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addToast({
      type: 'success',
      message: 'تم تصدير سجل المراجعة بنجاح'
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
      {/* العنوان والأدوات */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجل المراجعة</h1>
          <p className="text-gray-600">تتبع جميع العمليات والأحداث في النظام</p>
        </div>
        
        <button
          onClick={exportAuditLog}
          className="btn-secondary"
        >
          تصدير السجل
        </button>
      </div>

      {/* الفلاتر */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="form-label">الإجراء</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="form-input"
            >
              <option value="all">جميع الإجراءات</option>
              <option value="CREATE">إنشاء</option>
              <option value="UPDATE">تحديث</option>
              <option value="DELETE">حذف</option>
              <option value="LOGIN">تسجيل دخول</option>
              <option value="LOGOUT">تسجيل خروج</option>
              <option value="EXPORT">تصدير</option>
              <option value="BULK_DELETE">حذف مجمع</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">المورد</label>
            <select
              value={filters.resource}
              onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
              className="form-input"
            >
              <option value="all">جميع الموارد</option>
              <option value="appointment">موعد</option>
              <option value="user">مستخدم</option>
              <option value="auth">مصادقة</option>
              <option value="system_settings">إعدادات النظام</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">الحالة</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="form-input"
            >
              <option value="all">جميع الحالات</option>
              <option value="success">نجح</option>
              <option value="failed">فشل</option>
              <option value="warning">تحذير</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">الفترة</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="form-input"
            >
              <option value="all">جميع التواريخ</option>
              <option value="1days">اليوم</option>
              <option value="7days">آخر 7 أيام</option>
              <option value="30days">آخر 30 يوم</option>
              <option value="90days">آخر 90 يوم</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">البحث</label>
            <input
              type="text"
              placeholder="البحث في السجل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* سجل المراجعة */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ والوقت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المورد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المستخدم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التفاصيل
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.timestamp.toLocaleString('ar-SA')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getActionIcon(log.action)}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {getActionText(log.action)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getResourceText(log.resource)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{log.userEmail}</div>
                      <div className="text-sm text-gray-500">{log.userRole}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                      {getStatusText(log.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {log.details?.title || JSON.stringify(log.details)}
                    </div>
                    {log.ipAddress && (
                      <div className="text-xs text-gray-500 mt-1">
                        IP: {log.ipAddress}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {auditLogs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">لا توجد سجلات مراجعة</p>
          </div>
        )}
      </div>

      {/* معلومات إضافية */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-blue-600 text-lg">ℹ️</span>
          </div>
          <div className="mr-3">
            <h3 className="text-sm font-medium text-blue-800">معلومات سجل المراجعة</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• يتم تسجيل جميع العمليات المهمة في النظام تلقائياً</p>
              <p>• السجل يحتفظ بالتفاصيل لمدة 90 يوم</p>
              <p>• يمكن تصدير السجل للتحليل الخارجي</p>
              <p>• جميع الأحداث مرتبطة بالمستخدم والوقت والتفاصيل</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
