'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useApi } from '@/hooks/useApi';
import { AppShell } from '@/components/ui/AppShell';
import { Card, StatCard, StreakDisplay, LevelBadge, VerificationBadge, EmptyState, Skeleton, BadgeChip } from '@/components/ui/index';
import { Bell, Plus, ChevronRight, Zap } from 'lucide-react';
import { formatDuration } from '@/lib/utils/exercises';
import { format } from 'date-fns';
import Link from 'next/link';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { request, loading } = useApi();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sessRes, analyticsRes, notifRes] = await Promise.all([
      request<any>('/api/sessions?limit=5'),
      request<any>('/api/exercises/analytics?period=7'),
      request<any>('/api/notifications?unread=true&limit=1'),
    ]);
    if (sessRes?.success) setSessions(sessRes.data);
    if (analyticsRes?.success) setAnalytics(analyticsRes.data);
    if (notifRes?.success) setUnreadCount(notifRes.unreadCount);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todaySessions = sessions.filter(s => {
    const d = new Date(s.date);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });

  return (
    <AppShell
      rightAction={
        <button onClick={() => setShowNotifications(true)} className="relative p-2">
          <Bell size={22} className="text-dark-300" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      }
    >
      <div className="px-4 pt-4 space-y-6 pb-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-dark-400 text-sm">{greeting()},</p>
          <h1 className="font-display text-3xl font-bold text-dark-50">{user?.name?.split(' ')[0]} 👋</h1>
        </motion.div>

        {/* Streak + Level */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-gradient-to-br from-dark-800 to-dark-900 border-dark-600">
            <div className="flex items-center justify-between mb-3">
              <StreakDisplay streak={user?.streak || 0} />
              <div className="text-right">
                <p className="text-xs text-dark-400">Best</p>
                <p className="font-display font-bold text-dark-200">{user?.longestStreak || 0} days</p>
              </div>
            </div>
            <LevelBadge level={user?.level || 1} xp={user?.xp || 0} />
          </Card>
        </motion.div>

        {/* Today Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-dark-200">Today</h2>
            <span className="text-xs text-dark-500">{format(new Date(), 'EEEE, MMM d')}</span>
          </div>
          {todaySessions.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-3xl mb-2">🌅</p>
              <p className="text-dark-300 font-medium">No workouts yet today</p>
              <p className="text-dark-500 text-sm mt-1">Start your first session!</p>
              <button
                onClick={() => router.push('/workout')}
                className="mt-4 inline-flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              >
                <Plus size={16} /> Start Workout
              </button>
            </Card>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((s: any) => (
                <Card key={s._id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-500/15 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {getExerciseEmoji(s.exerciseType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark-100 capitalize">{s.exerciseType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-dark-400">
                      {s.reps > 0 ? `${s.reps} reps • ` : ''}{formatDuration(s.duration)} • {s.caloriesBurned} cal
                    </p>
                  </div>
                  <VerificationBadge score={s.verificationScore} verified={s.verified} />
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="font-display font-semibold text-dark-200 mb-3">This Week</h2>
          {loading && !analytics ? (
            <div className="grid grid-cols-2 gap-3">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Workouts" value={analytics?.totals?.workouts || 0} icon="🏋️" />
              <StatCard label="Calories" value={`${analytics?.totals?.calories || 0}`} icon="🔥" sub="kcal burned" />
              <StatCard label="Total Reps" value={analytics?.totals?.reps || 0} icon="💪" />
              <StatCard label="Avg Score" value={`${analytics?.totals?.avgVerification || 0}%`} icon="✅" sub="verification" />
            </div>
          )}
        </motion.div>

        {/* Badges */}
        {user?.badges && user.badges.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-dark-200">Badges</h2>
              <Link href="/profile" className="text-xs text-brand-400">See all</Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {user.badges.slice(0, 4).map(b => (
                <BadgeChip key={b.id} icon={b.icon} name={b.name} earned />
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-dark-200">Recent</h2>
              <Link href="/analytics" className="text-xs text-brand-400 flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {sessions.slice(0, 3).map((s: any) => (
                <Card key={s._id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 bg-dark-700 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {getExerciseEmoji(s.exerciseType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-100 capitalize">{s.exerciseType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-dark-500">{format(new Date(s.date), 'MMM d • h:mm a')}</p>
                  </div>
                  <VerificationBadge score={s.verificationScore} verified={s.verified} />
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Start workout CTA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <button
            onClick={() => router.push('/workout')}
            className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl font-display font-bold text-white text-lg flex items-center justify-center gap-2 brand-glow active:scale-95 transition-transform"
          >
            <Zap size={22} />
            Start Workout
          </button>
        </motion.div>
      </div>

      {showNotifications && (
        <NotificationPanel onClose={() => { setShowNotifications(false); setUnreadCount(0); }} />
      )}
    </AppShell>
  );
}

function getExerciseEmoji(type: string) {
  const map: Record<string, string> = {
    pushups: '💪', diamond_pushups: '💎', pullups: '🏋️', dips: '⬇️',
    squats: '🦵', jump_squats: '⬆️', lunges: '🚶', plank: '🏃',
    jogging: '🏃‍♂️', running: '🏅', burpees: '🔥', jumping_jacks: '⭐',
    mountain_climbers: '⛰️', russian_twists: '🌀', leg_raises: '🦶',
  };
  return map[type] || '🎯';
}
