'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '@/hooks/useApi';
import { Target, X, Trophy, Clock, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

const goalLabel: Record<string, string> = {
  workouts: 'workouts',
  reps: 'total reps',
  duration: 'minutes total',
  streak: 'day streak',
};

export function StakesPanel({ groupId }: { groupId: string }) {
  const { request } = useApi();
  const [stakes, setStakes] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const res = await request<any>(`/api/stakes?scope=group&groupId=${groupId}`, { showError: false });
    if (res?.success) setStakes(res.data);
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const checkProgress = async (id: string) => {
    const res = await request<any>('/api/stakes', {
      method: 'PATCH',
      body: { stakeId: id, action: 'check' },
    });
    if (res?.success) {
      load();
      if (res.data.status === 'won') toast.success('🏆 Stake won! XP awarded.');
      else if (res.data.status === 'lost') toast.error('Stake lost — XP forfeited.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-dark-100 flex items-center gap-2">
          <Target size={16} className="text-brand-300" />
          Accountability Stakes
        </h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-300 font-semibold"
        >
          <Plus size={12} />
          New Stake
        </button>
      </div>

      {stakes.length === 0 ? (
        <div className="glass-card rounded-2xl p-4 text-center">
          <Target size={28} className="text-dark-500 mx-auto mb-2" />
          <p className="text-sm text-dark-300 font-medium">No stakes yet</p>
          <p className="text-[11px] text-dark-500 mt-1">
            Pledge XP to a goal — win it back if you hit, forfeit if you don&apos;t.
          </p>
        </div>
      ) : (
        stakes.map((s) => {
          const pct = Math.min(100, (s.progress / s.target) * 100);
          const overdue = new Date(s.deadline) < new Date() && s.status === 'active';
          return (
            <div
              key={s._id}
              className={`relative overflow-hidden rounded-2xl border backdrop-blur-md p-3 ${
                s.status === 'won'
                  ? 'bg-green-500/10 border-green-500/30'
                  : s.status === 'lost'
                    ? 'bg-red-500/10 border-red-500/30'
                    : overdue
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'glass-card'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                  {s.status === 'won' ? '🏆' : s.status === 'lost' ? '💔' : overdue ? '⏰' : '🎯'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-semibold text-dark-100">
                    {s.userId?.name || 'Member'} pledged{' '}
                    <span className="text-brand-300">{s.stakeXP} XP</span>
                  </p>
                  <p className="text-xs text-dark-300">
                    {s.target} {goalLabel[s.goalType]} by {format(new Date(s.deadline), 'MMM d')}
                  </p>
                  {s.description && <p className="text-[11px] text-dark-400 mt-1 italic">&ldquo;{s.description}&rdquo;</p>}

                  {s.status === 'active' && (
                    <>
                      <div className="mt-2 h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #fb923c, #f97316)',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-dark-400">
                        <span>{s.progress} / {s.target}</span>
                        <button
                          onClick={() => checkProgress(s._id)}
                          className="text-brand-300 font-semibold"
                        >
                          Check progress
                        </button>
                      </div>
                    </>
                  )}
                  {s.status === 'won' && (
                    <p className="mt-2 text-[11px] text-green-300 flex items-center gap-1">
                      <Trophy size={11} />
                      +{s.stakeXP} XP earned
                    </p>
                  )}
                  {s.status === 'lost' && (
                    <p className="mt-2 text-[11px] text-red-300 flex items-center gap-1">
                      <AlertCircle size={11} />
                      −{s.stakeXP} XP forfeited
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateStakeModal
            groupId={groupId}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateStakeModal({
  groupId,
  onClose,
  onCreated,
}: {
  groupId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { request, loading } = useApi();
  const [form, setForm] = useState({
    goalType: 'workouts' as 'workouts' | 'reps' | 'duration' | 'streak',
    target: 5,
    days: 7,
    stakeXP: 50,
    description: '',
  });

  const submit = async () => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + form.days);
    const res = await request<any>('/api/stakes', {
      method: 'POST',
      body: {
        groupId,
        goalType: form.goalType,
        target: form.target,
        deadline,
        stakeXP: form.stakeXP,
        description: form.description,
      },
    });
    if (res?.success) {
      toast.success('Stake locked');
      onCreated();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-lg glass-strong rounded-t-3xl pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-dark-600 rounded-full" />
        </div>
        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-dark-50">Create Stake</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 text-dark-300 text-sm"
          >
            ×
          </button>
        </div>
        <div className="px-6 pt-4 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-dark-400 font-semibold">Goal type</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(['workouts', 'reps', 'duration', 'streak'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setForm({ ...form, goalType: g })}
                  className={`py-2.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    form.goalType === g
                      ? 'bg-brand-500 text-white shadow-brand-glow'
                      : 'bg-white/5 text-dark-300 border border-white/10'
                  }`}
                >
                  {goalLabel[g]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-dark-400 font-semibold">Target</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.target}
                onChange={(e) => setForm({ ...form, target: parseInt(e.target.value) || 1 })}
                className="mt-1 w-full bg-dark-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-dark-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-dark-400 font-semibold">Days</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                value={form.days}
                onChange={(e) => setForm({ ...form, days: parseInt(e.target.value) || 1 })}
                className="mt-1 w-full bg-dark-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-dark-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-dark-400 font-semibold flex items-center gap-1">
              ⚡ XP at stake
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              step={10}
              value={form.stakeXP}
              onChange={(e) => setForm({ ...form, stakeXP: parseInt(e.target.value) || 10 })}
              className="mt-1 w-full bg-dark-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-dark-100 focus:outline-none focus:border-brand-500 font-display font-bold text-lg"
            />
            <p className="text-[10px] text-dark-500 mt-1">
              You forfeit this if you miss the goal. Keep it if you hit.
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-dark-400 font-semibold">Note (optional)</label>
            <input
              type="text"
              maxLength={100}
              placeholder="e.g. No excuses, full ROM only"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full bg-dark-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-display font-bold text-white shadow-brand-glow"
            style={{ background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #c2410c 100%)' }}
          >
            {loading ? 'Locking…' : `Lock ${form.stakeXP} XP`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
