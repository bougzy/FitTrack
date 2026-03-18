import { create } from 'zustand';
import { IUser } from '@/types';
import { saveAuthToIDB, getAuthFromIDB, clearAuthFromIDB } from '@/lib/utils/indexeddb';

interface AuthStore {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: IUser, token: string) => void;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
  updateUser: (updates: Partial<IUser>) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true, isLoading: false });
    saveAuthToIDB(token, user as unknown as Record<string, unknown>).catch(console.error);
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    clearAuthFromIDB().catch(console.error);
  },

  loadFromStorage: async () => {
    try {
      const stored = await getAuthFromIDB();
      if (stored?.token && stored?.user) {
        // Verify token is still valid by checking expiry
        const [, payloadB64] = stored.token.split('.');
        const decoded = JSON.parse(atob(payloadB64));
        if (decoded.exp && decoded.exp * 1000 > Date.now()) {
          set({
            user: stored.user as unknown as IUser,
            token: stored.token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Refresh user data from server
          try {
            const res = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${stored.token}` },
            });
            if (res.ok) {
              const data = await res.json();
              set({ user: data.data });
              saveAuthToIDB(stored.token, data.data).catch(console.error);
            }
          } catch {
            // Use cached data if offline
          }
          return;
        }
      }
    } catch {
      // Storage not available or token invalid
    }
    set({ isLoading: false });
  },

  updateUser: (updates) => {
    const { user, token } = get();
    if (user) {
      const updated = { ...user, ...updates };
      set({ user: updated });
      if (token) saveAuthToIDB(token, updated as unknown as Record<string, unknown>).catch(console.error);
    }
  },
}));
