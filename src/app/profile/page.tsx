'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useApi } from '@/hooks/useApi';
import { AppShell } from '@/components/ui/AppShell';
import { Card, LevelBadge, StreakDisplay, BadgeChip } from '@/components/ui/index';
import { LogOut, ChevronRight, Bell, Moon, Target, Shield } from 'lucide-react';

const ALL_BADGES = [
  { id: 'first_workout', name: 'First Step', icon: '🎉', description: 'Complete first workout' },
  { id: 'streak_7', name: '7-Day Warrior', icon: '🔥', description: '7-day streak' },
  { id: 'streak_30', name: 'Consistency Champion', icon: '👑', description: '30-day streak' },
  { id: 'verified_10', name: 'Verified Athlete', icon: '✅', description: '10 verified workouts' },
  { id: 'social_butterfly', name: 'Social', icon: '🦋', description: 'Join 3 groups' },
  { id: 'iron_will', name: 'Iron Will', icon: '💎', description: '100 total workouts' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const { request } = useApi();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/login');
    toast.success('Logged out');
  };

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const res = await request<any>('/api/auth/me', { method: 'PATCH', body: { name } });
    if (res?.success) {
      updateUser({ name });
      setEditMode(false);
      toast.success('Profile updated');
    }
    setSaving(false);
  };

  const toggleDarkMode = async () => {
    const newPref = { ...user?.preferences, darkMode: !user?.preferences?.darkMode };
    updateUser({ preferences: newPref as any });
    await request('/api/auth/me', { method: 'PATCH', body: { preferences: newPref } });
  };

  const toggleNotifications = async () => {
    const newPref = { ...user?.preferences, notificationsEnabled: !user?.preferences?.notificationsEnabled };
    updateUser({ preferences: newPref as any });
    await request('/api/auth/me', { method: 'PATCH', body: { preferences: newPref } });
  };

  const earnedBadgeIds = user?.badges?.map(b => b.id) || [];

  return (
    <AppShell title="Profile">
      <div className="px-4 pt-4 space-y-5 pb-4">
        {/* Avatar + Name */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="text-center py-6">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center font-display font-bold text-3xl text-white mx-auto mb-3">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            {editMode ? (
              <div className="flex gap-2 max-w-xs mx-auto">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-3 py-2 text-dark-50 focus:outline-none focus:border-brand-500 text-center"
                />
                <button onClick={handleSaveName} disabled={saving} className="px-3 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold">
                  {saving ? '...' : 'Save'}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditMode(true)} className="group">
                <h2 className="font-display text-2xl font-bold text-dark-50 group-hover:text-brand-400 transition-colors">{user?.name}</h2>
                <p className="text-xs text-dark-500 mt-1">Tap to edit</p>
              </button>
            )}
            <p className="text-dark-400 text-sm mt-1">{user?.email}</p>
          </Card>
        </motion.div>

        {/* Level + Streak */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="space-y-4">
            <LevelBadge level={user?.level || 1} xp={user?.xp || 0} />
            <div className="border-t border-dark-700 pt-3">
              <StreakDisplay streak={user?.streak || 0} />
            </div>
            <div className="flex gap-4 text-center pt-1">
              <div className="flex-1">
                <p className="font-display text-xl font-bold text-dark-50">{user?.totalWorkouts || 0}</p>
                <p className="text-xs text-dark-500">Total Workouts</p>
              </div>
              <div className="flex-1">
                <p className="font-display text-xl font-bold text-dark-50">{user?.longestStreak || 0}</p>
                <p className="text-xs text-dark-500">Best Streak</p>
              </div>
              <div className="flex-1">
                <p className="font-display text-xl font-bold text-dark-50">{user?.badges?.length || 0}</p>
                <p className="text-xs text-dark-500">Badges</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Badges */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="font-display font-semibold text-dark-200 mb-3">Badges</h3>
          <div className="grid grid-cols-3 gap-2">
            {ALL_BADGES.map(badge => (
              <BadgeChip
                key={badge.id}
                icon={badge.icon}
                name={badge.name}
                earned={earnedBadgeIds.includes(badge.id)}
              />
            ))}
          </div>
        </motion.div>

        {/* Fitness level */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="font-display font-semibold text-dark-200 mb-3">Fitness Level</h3>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
              <button
                key={level}
                onClick={async () => {
                  const newPref = { ...user?.preferences, fitnessLevel: level };
                  updateUser({ preferences: newPref as any });
                  await request('/api/auth/me', { method: 'PATCH', body: { preferences: newPref } });
                  toast.success('Updated!');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-display font-semibold capitalize transition-all ${
                  user?.preferences?.fitnessLevel === level
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800 text-dark-400 border border-dark-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="font-display font-semibold text-dark-200 mb-3">Settings</h3>
          <Card className="divide-y divide-dark-700 p-0 overflow-hidden">
            <SettingRow
              icon={<Bell size={18} />}
              label="Notifications"
              value={user?.preferences?.notificationsEnabled !== false}
              onToggle={toggleNotifications}
            />
            <SettingRow
              icon={<Moon size={18} />}
              label="Dark Mode"
              value={user?.preferences?.darkMode !== false}
              onToggle={toggleDarkMode}
            />
            <button className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-dark-700 transition-colors">
              <span className="text-dark-400"><Target size={18} /></span>
              <span className="text-sm font-medium text-dark-200 flex-1 text-left">Set Daily Reminder</span>
              <ChevronRight size={16} className="text-dark-600" />
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-dark-700 transition-colors">
              <span className="text-dark-400"><Shield size={18} /></span>
              <span className="text-sm font-medium text-dark-200 flex-1 text-left">Privacy & Data</span>
              <ChevronRight size={16} className="text-dark-600" />
            </button>
          </Card>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <button
            onClick={handleLogout}
            className="w-full py-4 bg-red-500/10 border border-red-500/20 rounded-xl font-display font-semibold text-red-400 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <LogOut size={18} />
            Sign Out
          </button>
          <p className="text-center text-xs text-dark-600 mt-3">FitTrack v1.0.0 • Made with 💪</p>
        </motion.div>
      </div>
    </AppShell>
  );
}

function SettingRow({ icon, label, value, onToggle }: { icon: React.ReactNode; label: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-dark-400">{icon}</span>
      <span className="text-sm font-medium text-dark-200 flex-1">{label}</span>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-brand-500' : 'bg-dark-600'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
