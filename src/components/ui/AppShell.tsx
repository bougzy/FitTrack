'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { BottomNav } from './BottomNav';
import { motion } from 'framer-motion';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  /** Hide the bottom nav (e.g. immersive workout screen). */
  hideNav?: boolean;
}

export function AppShell({ children, title, showBack, rightAction, hideNav }: AppShellProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 aurora-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl glass-brand flex items-center justify-center text-2xl float">
            💪
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative min-h-screen bg-dark-950 flex flex-col aurora-bg">
      {/* Subtle ambient mesh */}
      <div className="absolute inset-0 bg-mesh-brand opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.15] pointer-events-none" />

      {title && (
        <header className="sticky top-0 z-40 glass-strong safe-top border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto w-full">
            {showBack ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => router.back()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-dark-200 backdrop-blur-md text-sm font-medium"
              >
                ← Back
              </motion.button>
            ) : (
              <div className="w-16" />
            )}
            <h1 className="font-display text-base font-bold text-dark-50 tracking-wide">{title}</h1>
            <div className="w-16 flex justify-end">{rightAction}</div>
          </div>
        </header>
      )}

      <main className={`flex-1 ${hideNav ? '' : 'pb-28'} relative max-w-2xl mx-auto w-full`}>{children}</main>

      {!hideNav && <BottomNav />}
    </div>
  );
}
