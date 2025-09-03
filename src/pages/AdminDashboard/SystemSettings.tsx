import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import { useToastStore } from '../../store/toastStore';
import ConfirmDialog from '../../components/ConfirmDialog';

interface SystemSettings {
  // إعدادات عامة
  systemName: string;
  systemDescription: string;
  maintenanceMode: boolean;
  maxAppointmentsPerDay: number;
  appointmentDuration: number; // بالدقائق
  
  // إعدادات الإشعارات
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderTime: number; // قبل الموعد بساعات
  
  // إعدادات الأمان
  sessionTimeout: number; // بالدقائق
  passwordMinLength: number;
  requireStrongPassword: boolean;
  maxLoginAttempts: number;
  
  // إعدادات النسخ الاحتياطي
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupRetention: number; // عدد الأيام
  
  // إعدادات التكامل
  enableAPI: boolean;
  apiRateLimit: number; // طلبات في الساعة
  enableWebhooks: boolean;
}

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    systemName: 'نظام إدارة المواعيد',
    systemDescription: 'نظام شامل لإدارة المواعيد والموظفين',
    maintenanceMode: false,
    maxAppointmentsPerDay: 50,
    appointmentDuration: 30,
    emailNotifications: true,
    pushNotifications: true,
    reminderTime: 24,
    sessionTimeout: 60,
    passwordMinLength: 8,
    requireStrongPassword: true,
    maxLoginAttempts: 5,
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    enableAPI: false,
    apiRateLimit: 1000,
    enableWebhooks: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'backup' | 'integration'>('general');
  
  const { addToast } = useToastStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsRef = doc(db, 'system', 'settings');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        setSettings({ ...settings, ...settingsDoc.data() });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحميل الإعدادات: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const settingsRef = doc(db, 'system', 'settings');
      await setDoc(settingsRef, settings, { merge: true });
      
      addToast({
        type: 'success',
        message: 'تم حفظ الإعدادات بنجاح'
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في حفظ الإعدادات: ' + error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);
      const defaultSettings: SystemSettings = {
        systemName: 'نظام إدارة المواعيد',
        systemDescription: 'نظام شامل لإدارة المواعيد والموظفين',
        maintenanceMode: false,
        maxAppointmentsPerDay: 50,
        appointmentDuration: 30,
        emailNotifications: true,
        pushNotifications: true,
        reminderTime: 24,
        sessionTimeout: 60,
        passwordMinLength: 8,
        requireStrongPassword: true,
        maxLoginAttempts: 5,
        autoBackup: true,
        backupFrequency: 'daily',
        backupRetention: 30,
        enableAPI: false,
        apiRateLimit: 1000,
        enableWebhooks: false
      };
      
      setSettings(defaultSettings);
      const settingsRef = doc(db, 'system', 'settings');
      await setDoc(settingsRef, defaultSettings);
      
      addToast({
        type: 'success',
        message: 'تم إعادة تعيين الإعدادات إلى القيم الافتراضية'
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في إعادة تعيين الإعدادات: ' + error.message
      });
    } finally {
      setSaving(false);
      setShowResetDialog(false);
    }
  };

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general', label: 'عام', icon: '⚙️' },
    { id: 'notifications', label: 'الإشعارات', icon: '🔔' },
    { id: 'security', label: 'الأمان', icon: '🔒' },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: '💾' },
    { id: 'integration', label: 'التكامل', icon: '🔗' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إعدادات النظام</h1>
          <p className="text-gray-600">إدارة إعدادات النظام والأمان</p>
        </div>
        
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={() => setShowResetDialog(true)}
            className="btn-secondary"
            disabled={saving}
          >
            إعادة تعيين
          </button>
          <button
            onClick={saveSettings}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {/* التبويبات */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 space-x-reverse">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* محتوى التبويبات */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">الإعدادات العامة</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">اسم النظام</label>
                <input
                  type="text"
                  value={settings.systemName}
                  onChange={(e) => handleSettingChange('systemName', e.target.value)}
                  className="form-input"
                  placeholder="أدخل اسم النظام"
                />
              </div>
              
              <div>
                <label className="form-label">وصف النظام</label>
                <input
                  type="text"
                  value={settings.systemDescription}
                  onChange={(e) => handleSettingChange('systemDescription', e.target.value)}
                  className="form-input"
                  placeholder="أدخل وصف النظام"
                />
              </div>
              
              <div>
                <label className="form-label">الحد الأقصى للمواعيد يومياً</label>
                <input
                  type="number"
                  value={settings.maxAppointmentsPerDay}
                  onChange={(e) => handleSettingChange('maxAppointmentsPerDay', parseInt(e.target.value))}
                  className="form-input"
                  min="1"
                  max="1000"
                />
              </div>
              
              <div>
                <label className="form-label">مدة الموعد (بالدقائق)</label>
                <input
                  type="number"
                  value={settings.appointmentDuration}
                  onChange={(e) => handleSettingChange('appointmentDuration', parseInt(e.target.value))}
                  className="form-input"
                  min="5"
                  max="480"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="maintenanceMode"
                checked={settings.maintenanceMode}
                onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="maintenanceMode" className="mr-2 text-sm text-gray-700">
                وضع الصيانة (سيتم إيقاف النظام مؤقتاً)
              </label>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">إعدادات الإشعارات</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="emailNotifications" className="mr-2 text-sm text-gray-700">
                  تفعيل الإشعارات عبر البريد الإلكتروني
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pushNotifications"
                  checked={settings.pushNotifications}
                  onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="pushNotifications" className="mr-2 text-sm text-gray-700">
                  تفعيل الإشعارات الفورية
                </label>
              </div>
              
              <div>
                <label className="form-label">وقت التذكير (قبل الموعد بساعات)</label>
                <select
                  value={settings.reminderTime}
                  onChange={(e) => handleSettingChange('reminderTime', parseInt(e.target.value))}
                  className="form-input"
                >
                  <option value={1}>ساعة واحدة</option>
                  <option value={2}>ساعتين</option>
                  <option value={6}>6 ساعات</option>
                  <option value={12}>12 ساعة</option>
                  <option value={24}>24 ساعة</option>
                  <option value={48}>48 ساعة</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">إعدادات الأمان</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">مهلة انتهاء الجلسة (بالدقائق)</label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                  className="form-input"
                  min="5"
                  max="480"
                />
              </div>
              
              <div>
                <label className="form-label">الحد الأدنى لطول كلمة المرور</label>
                <input
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => handleSettingChange('passwordMinLength', parseInt(e.target.value))}
                  className="form-input"
                  min="6"
                  max="32"
                />
              </div>
              
              <div>
                <label className="form-label">الحد الأقصى لمحاولات تسجيل الدخول</label>
                <input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                  className="form-input"
                  min="3"
                  max="10"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="requireStrongPassword"
                checked={settings.requireStrongPassword}
                onChange={(e) => handleSettingChange('requireStrongPassword', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="requireStrongPassword" className="mr-2 text-sm text-gray-700">
                طلب كلمة مرور قوية (أحرف كبيرة وصغيرة وأرقام ورموز)
              </label>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">إعدادات النسخ الاحتياطي</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoBackup"
                  checked={settings.autoBackup}
                  onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="autoBackup" className="mr-2 text-sm text-gray-700">
                  تفعيل النسخ الاحتياطي التلقائي
                </label>
              </div>
              
              <div>
                <label className="form-label">تكرار النسخ الاحتياطي</label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                  className="form-input"
                  disabled={!settings.autoBackup}
                >
                  <option value="daily">يومياً</option>
                  <option value="weekly">أسبوعياً</option>
                  <option value="monthly">شهرياً</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">فترة الاحتفاظ بالنسخ الاحتياطية (بالأيام)</label>
                <input
                  type="number"
                  value={settings.backupRetention}
                  onChange={(e) => handleSettingChange('backupRetention', parseInt(e.target.value))}
                  className="form-input"
                  min="7"
                  max="365"
                  disabled={!settings.autoBackup}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integration' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">إعدادات التكامل</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableAPI"
                  checked={settings.enableAPI}
                  onChange={(e) => handleSettingChange('enableAPI', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enableAPI" className="mr-2 text-sm text-gray-700">
                  تفعيل واجهة برمجة التطبيقات (API)
                </label>
              </div>
              
              <div>
                <label className="form-label">حد معدل الطلبات (طلبات في الساعة)</label>
                <input
                  type="number"
                  value={settings.apiRateLimit}
                  onChange={(e) => handleSettingChange('apiRateLimit', parseInt(e.target.value))}
                  className="form-input"
                  min="100"
                  max="10000"
                  disabled={!settings.enableAPI}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableWebhooks"
                  checked={settings.enableWebhooks}
                  onChange={(e) => handleSettingChange('enableWebhooks', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enableWebhooks" className="mr-2 text-sm text-gray-700">
                  تفعيل Webhooks للتكامل مع الأنظمة الخارجية
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* حوار تأكيد إعادة التعيين */}
      <ConfirmDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={resetToDefaults}
        title="إعادة تعيين الإعدادات"
        message="هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="إعادة تعيين"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};

export default SystemSettings;
