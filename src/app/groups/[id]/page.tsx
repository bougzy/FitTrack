'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { AppShell } from '@/components/ui/AppShell';
import { Card, VerificationBadge, Skeleton, EmptyState } from '@/components/ui/index';
import { Trophy, Users, Activity, Settings, Crown, Medal } from 'lucide-react';
import { formatDuration } from '@/lib/utils/exercises';
import { format } from 'date-fns';

export default function GroupDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuthStore();
  const { request, loading } = useApi();
  const [data, setData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [tab, setTab] = useState<'feed' | 'leaderboard' | 'members'>('feed');
  const [lbPeriod, setLbPeriod] = useState<'week' | 'month' | 'alltime'>('week');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  useEffect(() => {
    if (id && tab === 'leaderboard') loadLeaderboard();
  }, [tab, lbPeriod, id]);

  const loadData = async () => {
    const res = await request<any>(`/api/groups/${id}`);
    if (res?.success) setData(res.data);

    const invRes = await request<any>('/api/invitations');
    if (invRes?.success) {
      setPendingRequests(invRes.data.filter((inv: any) => inv.groupId?._id === id || inv.groupId === id));
    }
  };

  const loadLeaderboard = async () => {
    const res = await request<any>(`/api/groups/${id}/leaderboard?period=${lbPeriod}`);
    if (res?.success) setLeaderboard(res.data);
  };

  const handleInviteAction = async (invitationId: string, action: 'accept' | 'reject') => {
    const res = await request<any>('/api/invitations', {
      method: 'PATCH',
      body: { invitationId, action },
    });
    if (res?.success) {
      loadData();
    }
  };

  if (loading && !data) {
    return (
      <AppShell title="Group" showBack>
        <div className="p-4 space-y-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </AppShell>
    );
  }

  if (!data) return <AppShell title="Group" showBack><EmptyState icon="❌" title="Group not found" /></AppShell>;

  const { group, recentSessions } = data;
  const isAdmin = group.members?.some((m: any) => {
    const uid = typeof m.userId === 'object' ? m.userId?._id?.toString() : m.userId?.toString();
    return uid === user?._id && m.role === 'admin';
  });

  return (
    <AppShell title={group.name} showBack>
      <div className="px-4 pt-4 space-y-4">
        {/* Group info */}
        <Card className="bg-gradient-to-br from-dark-800 to-dark-900">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-brand-500/20 rounded-2xl flex items-center justify-center text-3xl">👥</div>
            <div>
              <h2 className="font-display text-xl font-bold text-dark-50">{group.name}</h2>
              <p className="text-sm text-dark-400">{group.members?.length || 0} members • {group.privacy}</p>
            </div>
          </div>
          {group.description && <p className="text-sm text-dark-300 mb-3">{group.description}</p>}
          <div className="flex gap-4 text-center">
            <div className="flex-1">
              <p className="font-display text-2xl font-bold text-brand-400">{group.totalWorkouts || 0}</p>
              <p className="text-xs text-dark-500">Workouts</p>
            </div>
            <div className="flex-1">
              <p className="font-display text-2xl font-bold text-brand-400">{group.members?.length || 0}</p>
              <p className="text-xs text-dark-500">Members</p>
            </div>
            {group.challenges?.length > 0 && (
              <div className="flex-1">
                <p className="font-display text-2xl font-bold text-brand-400">{group.challenges.length}</p>
                <p className="text-xs text-dark-500">Challenges</p>
              </div>
            )}
          </div>
        </Card>

        {/* Pending join requests (admin only) */}
        {isAdmin && pendingRequests.length > 0 && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <p className="font-semibold text-yellow-300 text-sm mb-3">⏳ {pendingRequests.length} Join Request{pendingRequests.length > 1 ? 's' : ''}</p>
            {pendingRequests.map((req: any) => (
              <div key={req._id} className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                  <p className="text-sm text-dark-100">{req.inviteeId?.name || 'Unknown'}</p>
                  <p className="text-xs text-dark-400">{req.inviteeId?.email}</p>
                </div>
                <button onClick={() => handleInviteAction(req._id, 'accept')} className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-semibold">Accept</button>
                <button onClick={() => handleInviteAction(req._id, 'reject')} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold">Reject</button>
              </div>
            ))}
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-dark-800 p-1 rounded-xl">
          {[
            { key: 'feed', icon: Activity, label: 'Feed' },
            { key: 'leaderboard', icon: Trophy, label: 'Board' },
            { key: 'members', icon: Users, label: 'Members' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-display font-semibold transition-all ${tab === key ? 'bg-brand-500 text-white' : 'text-dark-400'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {tab === 'feed' && (
          <div className="space-y-2">
            {recentSessions?.length === 0 ? (
              <EmptyState icon="🏋️" title="No activity yet" description="Be the first to log a workout in this group!" />
            ) : (
              recentSessions?.map((s: any) => (
                <Card key={s._id} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-dark-700 rounded-xl flex items-center justify-center text-lg flex-shrink-0">💪</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark-100">
                      {s.userId?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-dark-300 capitalize mt-0.5">
                      {s.exerciseType?.replace(/_/g, ' ')} • {s.reps > 0 ? `${s.reps} reps • ` : ''}{formatDuration(s.duration)}
                    </p>
                    <p className="text-xs text-dark-500">{format(new Date(s.date), 'MMM d, h:mm a')}</p>
                  </div>
                  <VerificationBadge score={s.verificationScore} verified={s.verified} />
                </Card>
              ))
            )}
          </div>
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(['week', 'month', 'alltime'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setLbPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${lbPeriod === p ? 'bg-brand-500 text-white' : 'bg-dark-700 text-dark-400'}`}
                >
                  {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {leaderboard.length === 0 ? (
              <EmptyState icon="🏆" title="No data yet" description="Start logging workouts to appear on the leaderboard!" />
            ) : (
              leaderboard.map((entry: any) => (
                <Card key={entry.userId} className={`flex items-center gap-3 ${entry.rank <= 3 ? 'border-brand-500/30' : ''}`}>
                  <div className="w-10 flex-shrink-0 text-center">
                    {entry.rank === 1 ? <Crown size={22} className="text-yellow-400 mx-auto" /> :
                     entry.rank === 2 ? <Medal size={22} className="text-gray-300 mx-auto" /> :
                     entry.rank === 3 ? <Medal size={22} className="text-orange-400 mx-auto" /> :
                     <span className="font-display font-bold text-dark-400 text-lg">#{entry.rank}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-semibold text-dark-100">{entry.userName}</p>
                      <span className="text-xs text-dark-500">Lv.{entry.level}</span>
                    </div>
                    <p className="text-xs text-dark-400 mt-0.5">🔥 {entry.streak} streak • {entry.totalWorkouts} workouts</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-brand-400">{entry.totalWorkouts}</p>
                    <p className="text-xs text-dark-500">sessions</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Members */}
        {tab === 'members' && (
          <div className="space-y-2">
            {group.members?.map((m: any) => {
              const u = typeof m.userId === 'object' ? m.userId : { name: 'Member', level: 1 };
              return (
                <Card key={m._id || m.userId} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-500/15 rounded-xl flex items-center justify-center font-display font-bold text-brand-400">
                    {(u.name?.[0] || 'M').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-dark-100">{u.name || 'Member'}</p>
                      {m.role === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-brand-500/20 text-brand-400 rounded-md font-semibold">ADMIN</span>
                      )}
                    </div>
                    <p className="text-xs text-dark-500">Level {u.level || 1} • {m.totalWorkouts || 0} workouts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-dark-400">🔥 {m.streak || 0}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
