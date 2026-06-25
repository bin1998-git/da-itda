import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  role: 'user' | 'admin' | null;
  isAdmin: boolean;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
  setRole: (role: 'user' | 'admin' | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  role: null,
  isAdmin: false,
  setUser: (user) => set({ user }),
  setLoading: (v) => set({ isLoading: v }),
  setRole: (role) => set({ role, isAdmin: role === 'admin' }),
}));
