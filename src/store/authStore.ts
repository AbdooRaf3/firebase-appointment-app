import { create } from 'zustand';
import { User, AuthState } from '../types';
import { auth, db } from '../firebase/firebaseClient';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthStore extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // جلب بيانات المستخدم من Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: userData.displayName,
          role: userData.role,
          createdAt: userData.createdAt.toDate()
        };
        set({ user, loading: false });
      } else {
        throw new Error('لم يتم العثور على بيانات المستخدم');
      }
    } catch (error: any) {
      let errorMessage = 'حدث خطأ في تسجيل الدخول';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'البريد الإلكتروني غير مسجل';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'كلمة المرور غير صحيحة';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'البريد الإلكتروني غير صحيح';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage, loading: false });
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      set({ user: null, loading: false, error: null });
    } catch (error: any) {
      set({ error: 'حدث خطأ في تسجيل الخروج', loading: false });
    }
  },

  setUser: (user: User | null) => set({ user }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),

  initializeAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // جلب بيانات المستخدم من Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const user: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: userData.displayName,
              role: userData.role,
              createdAt: userData.createdAt.toDate()
            };
            set({ user, loading: false });
          } else {
            set({ user: null, loading: false, error: 'لم يتم العثور على بيانات المستخدم' });
          }
        } catch (error) {
          set({ user: null, loading: false, error: 'حدث خطأ في جلب بيانات المستخدم' });
        }
      } else {
        set({ user: null, loading: false });
      }
    });

    // إرجاع دالة إلغاء الاشتراك
    return unsubscribe;
  }
}));
