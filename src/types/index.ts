// تصدير جميع الأنواع
export * from './mobile';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'mayor' | 'secretary';
  createdAt: Date;
}

export interface Appointment {
  id?: string;
  title: string;
  description: string;
  when: Date;
  createdAt: Date;
  createdByUid: string;
  assignedToUid: string;
  status: 'pending' | 'done' | 'cancelled';
}

export interface DeviceToken {
  uid: string;
  token: string;
  platform: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface NotificationState {
  enabled: boolean;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}
