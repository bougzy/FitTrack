'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useApi } from '@/hooks/useApi';
import { Lock, Globe, Users, Zap } from 'lucide-react';

type Status = 'loading' | 'found' | 'joining' | 'joined' | 'error';

export default function JoinGroupPage() {
  const { code } = useParams() as { code: string };
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { request } = useApi();

  const [group, setGroup] = useState<any>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Save code to sessionStorage so login AND register pages
      // can pick it up and redirect back here after auth
      sessionStorage.setItem('pendingJoinCode', code);
      router.replace(
        `/login?redirect=${encodeURIComponent(`/join/${code}`)}`
      );
      return;
    }

    // Already logged in — clear any stale pending code and fetch preview
    sessionStorage.removeItem('pendingJoinCode');
    fetchGroupPreview();
  }, [isLoading, isAuthenticated, code]);

  const fetchGroupPreview = async () => {
    setStatus('loading');
    const res = await request<any>(
      `/api/groups/preview?code=${code.toUpperCase().trim()}`,
      { showError: false }
    );

    if (res?.success) {
      setGroup(res.data.group);
      setAlreadyMember(res.data.alreadyMember);
      setStatus('found');
    } else {
      setErrorMsg(
        res?.error || 'This invite link is invalid or has expired.'
      );
      setStatus('error');
    }
  };

  const handleJoin = async () => {
    setStatus('joining');
    const res = await request<any>('/api/groups/join', {
      method: 'POST',
      body: { inviteCode: code },
    });

    if (res?.success) {
      setStatus('joined');
      setTimeout(() => {
        router.replace(`/groups/${group?._id}`);
      }, 1800);
    } else {
      setErrorMsg(res?.error || 'Could not join. Please try again.');
      setStatus('error');
    }
  };

  // ---- LOADING ----
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center animate-pulse">
            <span className="text-3xl">💪</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-dark-400 text-sm">Loading invite...</p>
        </div>
      </div>
    );
  }

  // ---- ERROR ----
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center space-y-5"
        >
          <div className="text-6xl">❌</div>
          <h2 className="font-display text-2xl font-bold text-dark-50">
            Invalid Invite
          </h2>
          <p className="text-dark-400 text-sm">{errorMsg}</p>
          <button
            onClick={() => router.replace('/dashboard')}
            className="w-full py-4 bg-brand-500 text-white font-display font-bold rounded-2xl active:scale-95 transition-transform"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // ---- JOINED SUCCESS ----
  if (status === 'joined') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="text-7xl"
          >
            🎉
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-dark-50">
            You're in!
          </h2>
          <p className="text-dark-400">
            Welcome to{' '}
            <span className="text-brand-400 font-semibold">{group?.name}</span>
          </p>
          <p className="text-dark-500 text-sm">Taking you to the group...</p>
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mt-4" />
        </motion.div>
      </div>
    );
  }

  // ---- FOUND — group preview + join button ----
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-700/10 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-5"
        >
          {/* Branding */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 mb-2">
              <span className="text-2xl">💪</span>
            </div>
            <p className="text-dark-400 text-sm">FitTrack — Fitness Accountability</p>
          </div>

          {/* Group card */}
          <div className="bg-dark-800 border border-dark-600 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4 text-center">
              <p className="text-white/90 text-sm font-semibold tracking-wide uppercase">
                Group Invite
              </p>
            </div>

            <div className="px-6 py-6 text-center space-y-4">
              <div className="w-20 h-20 bg-brand-500/20 rounded-2xl flex items-center justify-center text-4xl mx-auto">
                👥
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-dark-50">
                  {group?.name}
                </h2>
                {group?.description && (
                  <p className="text-dark-400 text-sm mt-1.5 leading-relaxed">
                    {group.description}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 py-4 border-t border-b border-dark-700">
                <div className="text-center">
                  <p className="font-display text-xl font-bold text-brand-400">
                    {group?.memberCount || 0}
                  </p>
                  <p className="text-xs text-dark-500 flex items-center justify-center gap-1 mt-1">
                    <Users size={10} />
                    Members
                  </p>
                </div>
                <div className="w-px h-10 bg-dark-700" />
                <div className="text-center">
                  <p className="font-display text-xl font-bold text-brand-400">
                    {group?.totalWorkouts || 0}
                  </p>
                  <p className="text-xs text-dark-500 flex items-center justify-center gap-1 mt-1">
                    <Zap size={10} />
                    Workouts
                  </p>
                </div>
                <div className="w-px h-10 bg-dark-700" />
                <div className="text-center">
                  {group?.privacy === 'public' ? (
                    <Globe size={18} className="text-green-400 mx-auto" />
                  ) : (
                    <Lock size={18} className="text-dark-400 mx-auto" />
                  )}
                  <p className="text-xs text-dark-500 capitalize mt-1">
                    {group?.privacy}
                  </p>
                </div>
              </div>

              {/* Invite code pill */}
              <div className="inline-flex items-center gap-2 bg-dark-700 px-4 py-2 rounded-full">
                <span className="text-xs text-dark-500">Code:</span>
                <span className="font-mono font-bold text-brand-400 tracking-widest">
                  {code}
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          {alreadyMember ? (
            <div className="space-y-3">
              <div className="w-full py-3 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                <p className="text-green-400 font-semibold text-sm">
                  ✅ You are already a member of this group
                </p>
              </div>
              <button
                onClick={() => router.replace(`/groups/${group?._id}`)}
                className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
              >
                Open Group →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleJoin}
                disabled={status === 'joining'}
                className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold rounded-2xl text-lg disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-500/30"
              >
                {status === 'joining' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Join {group?.name}
                  </>
                )}
              </button>

              <button
                onClick={() => router.replace('/dashboard')}
                className="w-full py-3 text-dark-500 text-sm text-center hover:text-dark-300 transition-colors"
              >
                Maybe later
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}