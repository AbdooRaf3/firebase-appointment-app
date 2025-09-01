import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, FileText, Save } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import { User as UserType } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useNotificationStore } from '../../store/notificationStore';

const NewAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { sendNotification, scheduleNotification } = useNotificationStore();
  
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    when: '',
    assignedToUid: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersData: UserType[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        // عرض فقط رؤساء البلدية
        if (data.role === 'mayor') {
          usersData.push({
            uid: doc.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            createdAt: data.createdAt.toDate()
          });
        }
      });
      
      setUsers(usersData);
      
      // تحديد أول رئيس بلدية افتراضياً
      if (usersData.length > 0) {
        setFormData(prev => ({ ...prev, assignedToUid: usersData[0].uid }));
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحميل رؤساء البلدية: ' + error.message
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.when || !formData.assignedToUid) {
      addToast({
        type: 'error',
        message: 'يرجى ملء جميع الحقول المطلوبة'
      });
      return;
    }

    const selectedDate = new Date(formData.when);
    if (selectedDate < new Date()) {
      addToast({
        type: 'error',
        message: 'لا يمكن تحديد موعد في الماضي'
      });
      return;
    }

    setLoading(true);
    
    try {
      const newAppointment = {
        title: formData.title,
        description: formData.description,
        when: selectedDate,
        createdAt: serverTimestamp(),
        createdByUid: user!.uid,
        assignedToUid: formData.assignedToUid,
        status: 'pending'
      };

      const appointmentRef = await addDoc(collection(db, 'appointments'), newAppointment);
      
      // إرسال إشعار فوري لرئيس البلدية
      const assignedUser = users.find(u => u.uid === formData.assignedToUid);
      if (assignedUser) {
        await sendNotification({
          userId: formData.assignedToUid,
          title: 'موعد جديد',
          message: `تم إنشاء موعد جديد: "${formData.title}" في ${selectedDate.toLocaleString('ar-SA')}`,
          type: 'appointment_created',
          appointmentId: appointmentRef.id
        });

        // جدولة تنبيه قبل الموعد بساعة
        const reminderTime = new Date(selectedDate.getTime() - 60 * 60 * 1000); // قبل ساعة
        if (reminderTime > new Date()) {
          await scheduleNotification({
            userId: formData.assignedToUid,
            title: 'تذكير بالموعد',
            message: `موعدك القادم: "${formData.title}" في الساعة ${selectedDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`,
            type: 'appointment_reminder',
            appointmentId: appointmentRef.id
          }, reminderTime);
        }
      }
      
      addToast({
        type: 'success',
        message: 'تم إنشاء الموعد بنجاح'
      });
      
      // العودة إلى لوحة السكرتير
      navigate('/secretary');
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في إنشاء الموعد: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 ios-safe-area">
      {/* العنوان */}
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">موعد جديد</h1>
        <p className="text-gray-600">إنشاء موعد جديد لرئيس البلدية</p>
      </div>

      {/* نموذج إنشاء الموعد */}
      <div className="card mobile-optimized">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* عنوان الموعد */}
          <div>
            <label htmlFor="title" className="form-label">
              <FileText className="w-4 h-4 inline mr-2" />
              عنوان الموعد
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="form-input"
              placeholder="أدخل عنوان الموعد"
              required
            />
          </div>

          {/* وصف الموعد */}
          <div>
            <label htmlFor="description" className="form-label">
              <FileText className="w-4 h-4 inline mr-2" />
              وصف الموعد (اختياري)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-input"
              placeholder="أدخل تفاصيل الموعد"
              rows={3}
            />
          </div>

          {/* التاريخ والوقت */}
          <div>
            <label htmlFor="when" className="form-label">
              <Calendar className="w-4 h-4 inline mr-2" />
              التاريخ والوقت
            </label>
            <input
              type="datetime-local"
              id="when"
              name="when"
              value={formData.when}
              onChange={handleInputChange}
              className="form-input"
              min={getMinDateTime()}
              required
            />
          </div>

          {/* تعيين لرئيس البلدية */}
          <div>
            <label htmlFor="assignedToUid" className="form-label">
              <User className="w-4 h-4 inline mr-2" />
              تعيين لرئيس البلدية
            </label>
            <select
              id="assignedToUid"
              name="assignedToUid"
              value={formData.assignedToUid}
              onChange={handleInputChange}
              className="form-input"
              required
            >
              <option value="">اختر رئيس البلدية</option>
              {users.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.displayName}
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="text-sm text-red-600 mt-1">
                لا يوجد رؤساء بلدية متاحين
              </p>
            )}
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 space-x-reverse pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/secretary')}
              className="btn-secondary touch-target w-full sm:w-auto"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || users.length === 0}
              className="btn-primary flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50 disabled:cursor-not-allowed touch-target w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>إنشاء الموعد</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* معلومات إضافية */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">معلومات مهمة</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• سيتم إرسال إشعار فوري لرئيس البلدية عند إنشاء الموعد</li>
          <li>• يمكنك تعديل أو حذف الموعد لاحقاً من لوحة السكرتير</li>
          <li>• المواعيد تُعرض تلقائياً حسب التاريخ والوقت</li>
        </ul>
      </div>
    </div>
  );
};

export default NewAppointment;
