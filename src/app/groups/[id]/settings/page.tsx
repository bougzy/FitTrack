'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { AppShell } from '@/components/ui/AppShell';
import { Card, EmptyState } from '@/components/ui/index';
import { RefreshCw, Copy, Check, Trash2, Globe, Lock, Shield, Zap, Plus } from 'lucide-react';

export default function GroupSettingsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuthStore();
  const { request, loading } = useApi();
  const [group, setGroup] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    name: '', description: '', type: 'workouts', target: 10, durationDays: 7,
  });

  useEffect(() => { if (id) loadGroup(); }, [id]);

  const loadGroup = async () => {
    const res = await request<any>(`/api/groups/${id}`);
    if (res?.success) setGroup(res.data.group);
  };

  const isAdmin = group?.members?.some((m: any) => {
    const uid = typeof m.userId === 'object' ? m.userId?._id?.toString() : m.userId?.toString();
    return uid === user?._id && m.role === 'admin';
  });

  const updateGroup = async (updates: Record<string, unknown>) => {
    const res = await request<any>(`/api/groups/${id}`, { method: 'PATCH', body: updates });
    if (res?.success) {
      setGroup({ ...group, ...updates });
      toast.success('Updated!');
    }
  };

  const regenerateCode = async () => {
    const res = await request<any>(`/api/groups/${id}/regenerate-code`, { method: 'POST' });
    if (res?.success) {
      setGroup({ ...group, inviteCode: res.data.inviteCode });
      toast.success('New invite code generated!');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(group?.inviteCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite code copied!');
  };

  const removeMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the group?`)) return;
    const res = await request<any>(`/api/groups/${id}/members/${userId}`, { method: 'DELETE' });
    if (res?.success) {
      setGroup({ ...group, members: group.members.filter((m: any) => {
        const uid = typeof m.userId === 'object' ? m.userId?._id?.toString() : m.userId?.toString();
        return uid !== userId;
      })});
      toast.success(`${name} removed`);
    }
  };

  const deleteGroup = async () => {
    if (!confirm('Delete this group permanently? This cannot be undone.')) return;
    const res = await request<any>(`/api/groups/${id}`, { method: 'DELETE' });
    if (res?.success) {
      toast.success('Group deleted');
      router.replace('/groups');
    }
  };

  const createChallenge = async () => {
    const res = await request<any>(`/api/groups/${id}/challenges`, {
      method: 'POST',
      body: challengeForm,
    });
    if (res?.success) {
      toast.success('Challenge started! 🏆');
      setShowChallenge(false);
      setChallengeForm({ name: '', description: '', type: 'workouts', target: 10, durationDays: 7 });
    }
  };

  if (!group) return <AppShell title="Settings" showBack><EmptyState icon="⚙️" title="Loading..." /></AppShell>;
  if (!isAdmin) return <AppShell title="Settings" showBack><EmptyState icon="🔒" title="Admin access required" /></AppShell>;

  return (
    <AppShell title="Group Settings" showBack>
      <div className="px-4 pt-4 space-y-5 pb-4">
        {/* Group name & description */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="font-display font-semibold text-dark-200 mb-3">Basic Info</h3>
          <Card className="space-y-3">
            <div>
              <label className="block text-xs text-dark-400 mb-1.5">Group Name</label>
              <input
                defaultValue={group.name}
                onBlur={(e) => e.target.value !== group.name && updateGroup({ name: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-dark-50 focus:outline-none focus:border-brand-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1.5">Description</label>
              <textarea
                defaultValue={group.description}
                onBlur={(e) => e.target.value !== group.description && updateGroup({ description: e.target.value })}
                rows={2}
                className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-dark-50 focus:outline-none focus:border-brand-500 text-sm resize-none"
              />
            </div>
          </Card>
        </motion.div>

        {/* Privacy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h3 className="font-display font-semibold text-dark-200 mb-3">Privacy</h3>
          <Card className="space-y-3">
            <div className="flex gap-2">
              {(['private', 'public'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => updateGroup({ privacy: p })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    group.privacy === p ? 'bg-brand-500 text-white' : 'bg-dark-700 text-dark-400 border border-dark-600'
                  }`}
                >
                  {p === 'private' ? <Lock size={14} /> : <Globe size={14} />}
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {group.privacy === 'public' && (
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => updateGroup({ autoAccept: !group.autoAccept })}>
                <div className={`w-11 h-6 rounded-full transition-colors ${group.autoAccept ? 'bg-brand-500' : 'bg-dark-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform shadow ${group.autoAccept ? 'translate-x-5 ml-0.5' : 'ml-0.5'}`} />
                </div>
                <span className="text-sm text-dark-200">Auto-accept join requests</span>
              </label>
            )}
          </Card>
        </motion.div>

        {/* Invite code */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="font-display font-semibold text-dark-200 mb-3">Invite Code</h3>
          <Card className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-mono text-2xl font-bold text-brand-400 tracking-widest">{group.inviteCode}</p>
              <p className="text-xs text-dark-500 mt-1">Share this code for instant join</p>
            </div>
            <button onClick={copyCode} className="p-2 text-dark-400 hover:text-brand-400 transition-colors">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
            <button onClick={regenerateCode} className="p-2 text-dark-400 hover:text-brand-400 transition-colors">
              <RefreshCw size={18} />
            </button>
          </Card>
        </motion.div>

        {/* Challenges */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-dark-200">Challenges</h3>
            <button
              onClick={() => setShowChallenge(!showChallenge)}
              className="flex items-center gap-1.5 text-sm text-brand-400 font-semibold"
            >
              <Plus size={16} /> New
            </button>
          </div>

          {showChallenge && (
            <Card className="space-y-3 mb-3 border-brand-500/30">
              <div>
                <label className="block text-xs text-dark-400 mb-1.5">Challenge Name</label>
                <input
                  value={challengeForm.name}
                  onChange={(e) => setChallengeForm({ ...challengeForm, name: e.target.value })}
                  placeholder="7-Day Pushup Challenge"
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-dark-50 focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-dark-400 mb-1.5">Type</label>
                  <select
                    value={challengeForm.type}
                    onChange={(e) => setChallengeForm({ ...challengeForm, type: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-dark-50 focus:outline-none focus:border-brand-500 text-sm"
                  >
                    <option value="workouts">Workouts</option>
                    <option value="reps">Total Reps</option>
                    <option value="duration">Duration (min)</option>
                    <option value="streak">Streak Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-dark-400 mb-1.5">Target</label>
                  <input
                    type="number"
                    value={challengeForm.target}
                    onChange={(e) => setChallengeForm({ ...challengeForm, target: parseInt(e.target.value) })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-dark-50 focus:outline-none focus:border-brand-500 text-sm"
                    min={1}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1.5">Duration (days)</label>
                <input
                  type="number"
                  value={challengeForm.durationDays}
                  onChange={(e) => setChallengeForm({ ...challengeForm, durationDays: parseInt(e.target.value) })}
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-dark-50 focus:outline-none focus:border-brand-500 text-sm"
                  min={1} max={90}
                />
              </div>
              <button
                onClick={createChallenge}
                disabled={loading}
                className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl text-sm disabled:opacity-50"
              >
                {loading ? 'Starting...' : '🏆 Start Challenge'}
              </button>
            </Card>
          )}

          {group.challenges?.filter((c: any) => c.active).length === 0 ? (
            <p className="text-sm text-dark-500 text-center py-4">No active challenges. Create one above!</p>
          ) : (
            group.challenges?.filter((c: any) => c.active).map((c: any) => (
              <Card key={c._id} className="border-brand-500/20">
                <div className="flex items-start gap-2">
                  <Zap size={16} className="text-brand-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-dark-100 text-sm">{c.name}</p>
                    <p className="text-xs text-dark-400 mt-0.5">Target: {c.target} {c.type} • Ends: {new Date(c.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </motion.div>

        {/* Members management */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="font-display font-semibold text-dark-200 mb-3">Members ({group.members?.length})</h3>
          <div className="space-y-2">
            {group.members?.map((m: any) => {
              const memberUser = typeof m.userId === 'object' ? m.userId : { name: 'Member', _id: m.userId };
              const uid = memberUser?._id?.toString() || m.userId?.toString();
              const isOwner = uid === group.owner?.toString();
              const isCurrentUser = uid === user?._id;

              return (
                <Card key={uid} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 bg-brand-500/15 rounded-xl flex items-center justify-center font-bold text-brand-400 text-sm flex-shrink-0">
                    {memberUser?.name?.[0]?.toUpperCase() || 'M'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-dark-100 truncate">{memberUser?.name || 'Member'}</p>
                      {isOwner && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-semibold">OWNER</span>}
                      {!isOwner && m.role === 'admin' && <span className="text-[10px] px-1.5 py-0.5 bg-brand-500/20 text-brand-400 rounded font-semibold">ADMIN</span>}
                    </div>
                    <p className="text-xs text-dark-500">{m.totalWorkouts || 0} workouts</p>
                  </div>
                  {!isOwner && !isCurrentUser && (
                    <button
                      onClick={() => removeMember(uid, memberUser?.name || 'Member')}
                      className="p-1.5 text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Danger zone */}
        {group.owner?.toString() === user?._id && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h3 className="font-display font-semibold text-red-400 mb-3">Danger Zone</h3>
            <button
              onClick={deleteGroup}
              className="w-full py-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Trash2 size={16} /> Delete Group Permanently
            </button>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
