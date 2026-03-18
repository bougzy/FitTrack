// 'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '';
  const setAuth = useAuthStore((s) => s.setAuth);
  const [redirect, setRedirect] = useState(redirectParam || '/dashboard');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingJoinCode');
    if (pending) {
      setRedirect(`/join/${pending}`);
    } else if (redirectParam) {
      setRedirect(redirectParam);
    }
  }, [redirectParam]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password)
      return toast.error('Fill in all fields');
    if (form.password !== form.confirm)
      return toast.error('Passwords do not match');
    if (form.password.length < 6)
      return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!data.success) return toast.error(data.error);
      setAuth(data.data.user, data.data.token);
      toast.success("Account created! Let's get moving 🔥");
      sessionStorage.removeItem('pendingJoinCode');
      router.replace(redirect);
    } catch {
      toast.error('Connection error. Are you online?');
    } finally {
      setLoading(false);
    }
  };

  const isInviteFlow = redirect.startsWith('/join/');

  const passwordStrength = (p: string) => {
    if (p.length === 0) return null;
    if (p.length < 6) return { label: 'Too short', color: 'bg-red-500', width: '25%' };
    if (p.length < 8) return { label: 'Weak', color: 'bg-orange-500', width: '50%' };
    if (!/[0-9]/.test(p) || !/[A-Z]/.test(p))
      return { label: 'Fair', color: 'bg-yellow-500', width: '75%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = passwordStrength(form.password);

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-700/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        {isInviteFlow && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-brand-500/15 border border-brand-500/30 rounded-2xl text-center"
          >
            <p className="text-2xl mb-1">👥</p>
            <p className="font-semibold text-brand-300 text-sm">You have a group invite!</p>
            <p className="text-dark-400 text-xs mt-1">
              Create a free account to join the group
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
          <h1 className="font-display text-3xl font-bold text-dark-50">Join FitTrack</h1>
          <p className="text-dark-400 mt-1">Build accountability. Build habits.</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleRegister}
          className="space-y-4"
        >
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', autocomplete: 'name' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-dark-300 mb-2">{field.label}</label>
              <input
                type={field.type}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                autoComplete={field.autocomplete}
                className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3.5 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                autoComplete="new-password"
                className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3.5 pr-12 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {strength && (
              <div className="mt-2">
                <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all`} style={{ width: strength.width }} />
                </div>
                <p className="text-xs text-dark-400 mt-1">{strength.label}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Confirm Password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="Repeat password"
              autoComplete="new-password"
              className={`w-full bg-dark-800 border rounded-xl px-4 py-3.5 text-dark-50 placeholder-dark-500 focus:outline-none focus:ring-1 transition-colors ${
                form.confirm && form.confirm !== form.password
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-dark-600 focus:border-brand-500 focus:ring-brand-500'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus size={18} />
                {isInviteFlow ? 'Create Account & Join Group' : 'Create Account'}
              </>
            )}
          </button>

          <p className="text-center text-dark-400 text-sm pt-2">
            Already have an account?{' '}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirect)}`}
              className="text-brand-400 hover:text-brand-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}