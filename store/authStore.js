import { create } from 'zustand';
import { getStoredUser, getToken } from '../services/api.js';

export const useAuthStore = create((set) => ({
  user: getStoredUser(),
  token: getToken(),
  isLoggedIn: !!getToken(),

  setAuth: (user, token) => set({ user, token, isLoggedIn: true }),
  clearAuth: () => set({ user: null, token: null, isLoggedIn: false }),
}));
