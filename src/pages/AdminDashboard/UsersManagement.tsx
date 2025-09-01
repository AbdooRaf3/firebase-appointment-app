import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserPlus, Search } from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import { User } from '../../types';
import { useToastStore } from '../../store/toastStore';
import ConfirmDialog from '../../components/ConfirmDialog';

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  
  const { addToast } = useToastStore();

  // نموذج إضافة/تعديل مستخدم
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    role: 'secretary' as 'admin' | 'mayor' | 'secretary',
    password: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
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
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في تحميل المستخدمين: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.displayName || !formData.password) {
      addToast({
        type: 'error',
        message: 'يرجى ملء جميع الحقول المطلوبة'
      });
      return;
    }

    try {
      if (editingUser) {
        // تحديث مستخدم موجود
        const userRef = doc(db, 'users', editingUser.uid);
        await updateDoc(userRef, {
          displayName: formData.displayName,
          role: formData.role
        });
        
        addToast({
          type: 'success',
          message: 'تم تحديث المستخدم بنجاح'
        });
      } else {
        // إضافة مستخدم جديد
        // ملاحظة: في التطبيق الحقيقي، يجب إنشاء المستخدم في Auth أولاً
        const newUser = {
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'users'), newUser);
        
        addToast({
          type: 'success',
          message: 'تم إضافة المستخدم بنجاح'
        });
      }
      
      resetForm();
      loadUsers();
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في حفظ المستخدم: ' + error.message
      });
    }
  };

  const handleDelete = async (user: User) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      
      addToast({
        type: 'success',
        message: 'تم حذف المستخدم بنجاح'
      });
      
      loadUsers();
    } catch (error: any) {
      addToast({
        type: 'error',
        message: 'فشل في حذف المستخدم: ' + error.message
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      displayName: '',
      role: 'secretary',
      password: ''
    });
    setShowAddForm(false);
    setEditingUser(null);
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      password: ''
    });
    setShowAddForm(true);
  };

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'mayor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'secretary':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مدير';
      case 'mayor':
        return 'رئيس البلدية';
      case 'secretary':
        return 'سكرتير';
      default:
        return role;
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
      {/* العنوان وشريط الأدوات */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
          <p className="text-gray-600">إضافة وتعديل وحذف المستخدمين في النظام</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2 space-x-reverse"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مستخدم</span>
        </button>
      </div>

      {/* شريط البحث */}
      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="البحث في المستخدمين..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input pr-10"
        />
      </div>

      {/* نموذج إضافة/تعديل مستخدم */}
      {showAddForm && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  placeholder="أدخل البريد الإلكتروني"
                  disabled={!!editingUser}
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="form-label">الاسم</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="form-input"
                  placeholder="أدخل الاسم"
                />
              </div>
              
              <div>
                <label className="form-label">الدور</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="form-input"
                >
                  <option value="secretary">سكرتير</option>
                  <option value="mayor">رئيس البلدية</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
              
              {!editingUser && (
                <div>
                  <label className="form-label">كلمة المرور</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-input"
                    placeholder="أدخل كلمة المرور"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end space-x-3 space-x-reverse">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {editingUser ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* قائمة المستخدمين */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المستخدم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الدور
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاريخ الإنشاء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 text-sm font-medium">
                            {user.displayName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(user.role)}`}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt.toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button
                        onClick={() => startEdit(user)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteUser(user)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">لا يوجد مستخدمين</p>
          </div>
        )}
      </div>

      {/* حوار تأكيد الحذف */}
      <ConfirmDialog
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => deleteUser && handleDelete(deleteUser)}
        title="حذف المستخدم"
        message={`هل أنت متأكد من حذف المستخدم "${deleteUser?.displayName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};

export default UsersManagement;
