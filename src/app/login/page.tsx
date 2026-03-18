'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Fill in all fields');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) return toast.error(data.error);
      setAuth(data.data.user, data.data.token);
      toast.success('Welcome back! 💪');
      router.replace(redirect);
    } catch {
      toast.error('Connection error. Are you online?');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body =
        forgotStep === 1
          ? { email: forgotEmail }
          : { email: forgotEmail, newPassword };
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) return toast.error(data.error);
      if (forgotStep === 1 && data.emailVerified) {
        setForgotStep(2);
        toast.success('Email found! Set your new password.');
      } else if (forgotStep === 2) {
        toast.success('Password reset! Please login.');
        setForgotMode(false);
        setForgotStep(1);
      }
    } catch {
      toast.error('Error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-700/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        {/* Invite banner — shows when coming from an invite link */}
        {redirect.startsWith('/join/') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-brand-500/15 border border-brand-500/30 rounded-2xl text-center"
          >
            <p className="text-2xl mb-1">👥</p>
            <p className="font-semibold text-brand-300 text-sm">You have a group invite!</p>
            <p className="text-dark-400 text-xs mt-1">
              Sign in or create an account to join the group
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 mb-4 brand-glow">
            <span className="text-4xl">💪</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-dark-50">FitTrack</h1>
          <p className="text-dark-400 mt-1 font-body">Your accountability fitness partner</p>
        </motion.div>

        {!forgotMode ? (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3.5 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3.5 pr-12 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="text-brand-400 text-sm hover:text-brand-300 transition-colors"
            >
              Forgot password?
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={18} />
                  Sign In
                </>
              )}
            </button>

            <p className="text-center text-dark-400 text-sm pt-2">
              No account?{' '}
              <Link
                href={`/register?redirect=${encodeURIComponent(redirect)}`}
                className="text-brand-400 hover:text-brand-300 font-medium"
              >
                Create one free
              </Link>
            </p>
          </motion.form>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleForgot}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <h2 className="font-display text-2xl font-bold">Reset Password</h2>
              <p className="text-dark-400 text-sm mt-1">
                {forgotStep === 1 ? 'Enter your email to verify' : 'Set your new password'}
              </p>
            </div>

            {forgotStep === 1 ? (
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3.5 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            ) : (
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3.5 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 text-white font-display font-bold py-4 rounded-xl disabled:opacity-50 transition-all active:scale-95"
            >
              {loading
                ? 'Processing...'
                : forgotStep === 1
                ? 'Verify Email'
                : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setForgotStep(1);
              }}
              className="w-full text-dark-400 text-sm"
            >
              ← Back to login
            </button>
          </motion.form>
        )}
      </div>
    </div>
  );
}