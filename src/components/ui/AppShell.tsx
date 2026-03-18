'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function AppShell({ children, title, showBack, rightAction }: AppShellProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center animate-pulse">
            <span className="text-2xl">💪</span>
          </div>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {title && (
        <header className="sticky top-0 z-40 bg-dark-950/90 backdrop-blur-xl border-b border-dark-800 safe-top">
          <div className="flex items-center justify-between px-4 py-3">
            {showBack ? (
              <button onClick={() => router.back()} className="text-dark-300 hover:text-dark-50 transition-colors p-1">
                ← Back
              </button>
            ) : <div className="w-16" />}
            <h1 className="font-display text-lg font-bold text-dark-50">{title}</h1>
            <div className="w-16 flex justify-end">{rightAction}</div>
          </div>
        </header>
      )}
      <main className="flex-1 pb-24 page-enter">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
