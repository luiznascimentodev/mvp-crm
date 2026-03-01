import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('access_token', token);
        set({ token, user });
      },
      clearAuth: () => {
        localStorage.removeItem('access_token');
        set({ token: null, user: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'orbit-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
