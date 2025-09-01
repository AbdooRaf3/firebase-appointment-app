import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, user, loading } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  // إعادة التوجيه إذا كان المستخدم مسجل دخول
  useEffect(() => {
    if (user && !loading) {
      const redirectPath = getRedirectPath(user.role);
      navigate(redirectPath);
    }
  }, [user, loading, navigate]);

  const getRedirectPath = (role: string) => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'mayor':
        return '/mayor';
      case 'secretary':
        return '/secretary';
      default:
        return '/';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      addToast({
        type: 'error',
        message: 'يرجى ملء جميع الحقول المطلوبة'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const signedInUser = await signIn(email, password);
      addToast({
        type: 'success',
        message: 'تم تسجيل الدخول بنجاح'
      });
      
      // التوجيه المباشر بعد نجاح تسجيل الدخول
      if (signedInUser) {
        const redirectPath = getRedirectPath(signedInUser.role);
        navigate(redirectPath);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.message || 'حدث خطأ في تسجيل الدخول'
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* الشعار والعنوان */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-2xl font-bold">م</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            تسجيل الدخول
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            سجل دخولك لإدارة مواعيد رئيس البلدية
          </p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* البريد الإلكتروني */}
            <div>
              <label htmlFor="email" className="form-label">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pr-10"
                  placeholder="أدخل بريدك الإلكتروني"
                  dir="ltr"
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label htmlFor="password" className="form-label">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10"
                  placeholder="أدخل كلمة المرور"
                  dir="ltr"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 pl-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* زر تسجيل الدخول */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  جاري تسجيل الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </div>

          {/* ملاحظات */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              للوصول إلى النظام، يجب أن يكون لديك حساب مسجل مسبقاً
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
