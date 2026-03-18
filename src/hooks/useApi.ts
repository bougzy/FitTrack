'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface FetchOptions {
  method?: string;
  body?: unknown;
  showError?: boolean;
}

export function useApi() {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    async <T = unknown>(url: string, options: FetchOptions = {}): Promise<T | null> => {
      const { method = 'GET', body, showError = true } = options;
      setLoading(true);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json();

        if (res.status === 401) {
          logout();
          return null;
        }

        if (!data.success && showError) {
          toast.error(data.error || 'Something went wrong');
          return null;
        }

        return data as T;
      } catch (err) {
        if (showError) {
          if (!navigator.onLine) {
            toast.error('You are offline. Changes will sync when reconnected.');
          } else {
            toast.error('Network error. Please try again.');
          }
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [token, logout]
  );

  return { request, loading };
}
