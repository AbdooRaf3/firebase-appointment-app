import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '../firebase/firebaseClient';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { User, Mail, Shield, Calendar, Edit, Save, X } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useToastStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName
      });

      // تحديث المستخدم في الحالة المحلية
      updateUser({
        ...user,
        displayName: formData.displayName
      });

      setIsEditing(false);
      addToast({
        type: 'success',
        message: 'تم تحديث الملف الشخصي بنجاح'
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحديث الملف الشخصي: ' + error.message
      });
    }
  };

  const handleChangePassword = async () => {
    if (!user || !auth.currentUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast({
        type: 'error',
        message: 'كلمة المرور الجديدة غير متطابقة'
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      addToast({
        type: 'error',
        message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
      });
      return;
    }

    try {
      // إعادة المصادقة
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // تغيير كلمة المرور
      await updatePassword(auth.currentUser, passwordData.newPassword);

      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      addToast({
        type: 'success',
        message: 'تم تغيير كلمة المرور بنجاح'
      });
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        addToast({
          type: 'error',
          message: 'كلمة المرور الحالية غير صحيحة'
        });
      } else {
        addToast({
          type: 'error',
          message: 'فشل في تغيير كلمة المرور: ' + error.message
        });
      }
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مدير النظام';
      case 'mayor':
        return 'رئيس البلدية';
      case 'secretary':
        return 'سكرتير';
      default:
        return 'مستخدم';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'mayor':
        return 'bg-blue-100 text-blue-800';
      case 'secretary':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">لا يمكن تحميل الملف الشخصي</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">الملف الشخصي</h1>
        <p className="text-gray-600 mt-2">إدارة معلومات حسابك وكلمة المرور</p>
      </div>

      {/* معلومات المستخدم */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">معلومات المستخدم</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>تعديل</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 space-x-reverse">
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      displayName: user.displayName || '',
                      email: user.email || ''
                    });
                  }}
                  className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>إلغاء</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* الاسم */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <User className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="form-input w-full"
                  placeholder="أدخل اسمك"
                />
              ) : (
                <p className="text-gray-900">{user.displayName || 'غير محدد'}</p>
              )}
            </div>
          </div>

          {/* البريد الإلكتروني */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <Mail className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <p className="text-gray-900">{user.email}</p>
              <p className="text-sm text-gray-500">لا يمكن تعديل البريد الإلكتروني</p>
            </div>
          </div>

          {/* الدور */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <Shield className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الدور
              </label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                {getRoleText(user.role)}
              </span>
            </div>
          </div>

          {/* تاريخ الإنشاء */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تاريخ إنشاء الحساب
              </label>
              <p className="text-gray-900">
                {user.createdAt ? user.createdAt.toLocaleDateString('ar-SA') : 'غير محدد'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* تغيير كلمة المرور */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">تغيير كلمة المرور</h2>
            {!isChangingPassword ? (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                تغيير كلمة المرور
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                إلغاء
              </button>
            )}
          </div>
        </div>

        {isChangingPassword && (
          <div className="p-6 space-y-4">
            {/* كلمة المرور الحالية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="form-input w-full"
                placeholder="أدخل كلمة المرور الحالية"
              />
            </div>

            {/* كلمة المرور الجديدة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="form-input w-full"
                placeholder="أدخل كلمة المرور الجديدة"
              />
              <p className="text-sm text-gray-500 mt-1">يجب أن تكون 6 أحرف على الأقل</p>
            </div>

            {/* تأكيد كلمة المرور الجديدة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="form-input w-full"
                placeholder="أعد إدخال كلمة المرور الجديدة"
              />
            </div>

            {/* زر الحفظ */}
            <div className="pt-4">
              <button
                onClick={handleChangePassword}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                حفظ كلمة المرور الجديدة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* معلومات إضافية */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-800 mb-2">معلومات مهمة</h3>
        <ul className="text-blue-700 space-y-1 text-sm">
          <li>• لا يمكن تغيير البريد الإلكتروني بعد إنشاء الحساب</li>
          <li>• كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل</li>
          <li>• ستتم إعادة تسجيل دخولك بعد تغيير كلمة المرور</li>
          <li>• احتفظ بكلمة المرور في مكان آمن</li>
        </ul>
      </div>
    </div>
  );
};

export default UserProfile;
