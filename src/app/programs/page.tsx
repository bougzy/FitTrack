'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '@/hooks/useApi';
import { AppShell } from '@/components/ui/AppShell';
import { Card, EmptyState, Skeleton } from '@/components/ui/index';
import { Plus, Play, Trash2, Clock, Dumbbell, Globe, Lock, X } from 'lucide-react';
import { EXERCISE_CONFIGS, getExercisesByCategory } from '@/lib/utils/exercises';

interface ProgramExercise {
  exerciseType: string;
  targetReps?: number;
  durationSeconds?: number;
  sets: number;
  restSeconds: number;
}

export default function ProgramsPage() {
  const router = useRouter();
  const { request, loading } = useApi();
  const [tab, setTab] = useState<'mine' | 'shared'>('mine');
  const [programs, setPrograms] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    const res = await request<any>(`/api/programs?type=${tab}`);
    if (res?.success) setPrograms(res.data);
  };

  const handleStart = async (programId: string) => {
    await request(`/api/programs/${programId}`, {
      method: 'POST',
      body: { action: 'start' },
      showError: false,
    });
    router.push(`/programs/${programId}`);
  };

  const handleDelete = async (programId: string) => {
    if (!confirm('Delete this program?')) return;
    const res = await request<any>(`/api/programs/${programId}`, { method: 'DELETE' });
    if (res?.success) {
      toast.success('Program deleted');
      loadData();
    }
  };

  return (
    <AppShell
      title="Programs"
      rightAction={
        <button
          onClick={() => setShowCreate(true)}
          className="w-9 h-9 bg-brand-500/20 rounded-xl flex items-center justify-center text-brand-400 active:scale-95 transition-transform"
        >
          <Plus size={18} />
        </button>
      }
    >
      <div className="px-4 pt-4 space-y-4 pb-6">
        <div className="flex gap-2 bg-dark-800 p-1 rounded-xl">
          {(['mine', 'shared'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg font-display font-semibold text-sm transition-all ${
                t === tab ? 'bg-brand-500 text-white' : 'text-dark-400'
              }`}
            >
              {t === 'mine' ? 'My Programs' : 'Discover'}
            </button>
          ))}
        </div>

        {loading && programs.length === 0 ? (
          [0, 1, 2].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : programs.length === 0 ? (
          <EmptyState
            icon="📋"
            title={tab === 'mine' ? 'No programs yet' : 'Nothing shared yet'}
            description={
              tab === 'mine'
                ? 'Create a workout program and start it any time'
                : 'Public programs from other users will appear here'
            }
            action={
              tab === 'mine' ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm"
                >
                  Create Program
                </button>
              ) : null
            }
          />
        ) : (
          programs.map(p => (
            <Card key={p._id}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-brand-500/15 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  📋
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-semibold text-dark-100">{p.name}</p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        p.difficulty === 'advanced'
                          ? 'bg-red-500/15 text-red-400'
                          : p.difficulty === 'intermediate'
                          ? 'bg-yellow-500/15 text-yellow-400'
                          : 'bg-green-500/15 text-green-400'
                      }`}
                    >
                      {p.difficulty}
                    </span>
                    {p.shared && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded-md font-semibold flex items-center gap-1">
                        <Globe size={9} /> public
                      </span>
                    )}
                  </div>
                  {p.description && <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
                    <span className="flex items-center gap-1">
                      <Dumbbell size={11} /> {p.exercises?.length || 0} exercises
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> ~{p.estimatedMinutes || 0}m
                    </span>
                    {p.timesStarted > 0 && <span>{p.timesStarted}× started</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleStart(p._id)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Play size={14} fill="white" /> Start
                </button>
                {tab === 'mine' && (
                  <button
                    onClick={() => handleDelete(p._id)}
                    className="px-3 py-2.5 bg-dark-700 text-red-400 rounded-xl active:scale-95 transition-transform"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateProgramModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              setTab('mine');
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function CreateProgramModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { request } = useApi();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    shared: false,
  });
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [picking, setPicking] = useState(false);
  const grouped = getExercisesByCategory();

  const addExercise = (exerciseType: string) => {
    const cfg = EXERCISE_CONFIGS[exerciseType];
    const isDuration = cfg?.trackingType === 'duration';
    setExercises(prev => [
      ...prev,
      {
        exerciseType,
        targetReps: isDuration ? undefined : 10,
        durationSeconds: isDuration ? 30 : undefined,
        sets: 3,
        restSeconds: 30,
      },
    ]);
    setPicking(false);
  };

  const updateExercise = (i: number, patch: Partial<ProgramExercise>) => {
    setExercises(prev => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  };

  const removeExercise = (i: number) => {
    setExercises(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    if (exercises.length === 0) return toast.error('Add at least one exercise');
    setSubmitting(true);
    const res = await request<any>('/api/programs', {
      method: 'POST',
      body: { ...form, exercises },
    });
    setSubmitting(false);
    if (res?.success) {
      toast.success('Program created!');
      onCreated();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-dark-900 border-t border-dark-700 rounded-t-3xl"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-dark-600 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <h3 className="font-display text-xl font-bold text-dark-50">
            {step === 1 ? 'New Program' : 'Add Exercises'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center text-dark-300"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(92vh - 80px)', paddingBottom: '2rem' }}>
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Morning Routine"
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3.5 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What's this program for?"
                  rows={3}
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, difficulty: d })}
                      className={`py-2.5 rounded-xl text-sm font-semibold capitalize ${
                        form.difficulty === d
                          ? 'bg-brand-500 text-white'
                          : 'bg-dark-700 text-dark-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div
                onClick={() => setForm({ ...form, shared: !form.shared })}
                className="flex items-center justify-between p-4 bg-dark-700 rounded-xl cursor-pointer border border-dark-600"
              >
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-dark-200 flex items-center gap-1.5">
                    {form.shared ? <Globe size={14} /> : <Lock size={14} />}
                    Make public
                  </p>
                  <p className="text-xs text-dark-500 mt-0.5">
                    Other users can discover and start your program
                  </p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 relative ${form.shared ? 'bg-brand-500' : 'bg-dark-500'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.shared ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!form.name.trim()}
                className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-all"
              >
                Next: Add Exercises
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {exercises.length === 0 && !picking && (
                <div className="text-center py-6">
                  <p className="text-4xl mb-2">🏋️</p>
                  <p className="text-dark-400 text-sm">No exercises yet</p>
                </div>
              )}

              {exercises.map((e, i) => {
                const cfg = EXERCISE_CONFIGS[e.exerciseType];
                const isDuration = cfg?.trackingType === 'duration';
                return (
                  <Card key={i} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cfg?.icon}</span>
                      <p className="flex-1 font-semibold text-dark-100">{cfg?.label}</p>
                      <button
                        onClick={() => removeExercise(i)}
                        className="text-red-400 p-1.5 bg-red-500/10 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {!isDuration ? (
                        <div>
                          <label className="text-dark-500 block mb-1">Reps per set</label>
                          <input
                            type="number"
                            value={e.targetReps || 0}
                            onChange={ev => updateExercise(i, { targetReps: parseInt(ev.target.value) || 0 })}
                            className="w-full bg-dark-700 rounded-lg px-3 py-2 text-dark-50 text-sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="text-dark-500 block mb-1">Seconds</label>
                          <input
                            type="number"
                            value={e.durationSeconds || 0}
                            onChange={ev => updateExercise(i, { durationSeconds: parseInt(ev.target.value) || 0 })}
                            className="w-full bg-dark-700 rounded-lg px-3 py-2 text-dark-50 text-sm"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-dark-500 block mb-1">Sets</label>
                        <input
                          type="number"
                          value={e.sets}
                          onChange={ev => updateExercise(i, { sets: Math.max(1, parseInt(ev.target.value) || 1) })}
                          className="w-full bg-dark-700 rounded-lg px-3 py-2 text-dark-50 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-dark-500 block mb-1">Rest between sets (seconds)</label>
                        <input
                          type="number"
                          value={e.restSeconds}
                          onChange={ev => updateExercise(i, { restSeconds: parseInt(ev.target.value) || 0 })}
                          className="w-full bg-dark-700 rounded-lg px-3 py-2 text-dark-50 text-sm"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}

              {picking ? (
                <div className="space-y-3 max-h-72 overflow-y-auto p-3 bg-dark-800 rounded-xl">
                  {Object.entries(grouped).map(([cat, list]) => (
                    <div key={cat}>
                      <p className="text-xs uppercase text-dark-500 font-semibold mb-1.5">{cat}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {list.map(ex => (
                          <button
                            key={ex.type}
                            onClick={() => addExercise(ex.type)}
                            className="bg-dark-700 hover:bg-dark-600 rounded-lg p-2 text-left active:scale-95 transition-transform"
                          >
                            <span className="text-lg">{ex.icon}</span>
                            <p className="text-xs text-dark-100 font-medium leading-tight mt-0.5">{ex.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setPicking(false)}
                    className="w-full py-2 text-dark-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPicking(true)}
                  className="w-full p-3 border border-dashed border-dark-600 rounded-xl flex items-center justify-center gap-2 text-dark-400 hover:border-brand-500/40 hover:text-brand-400 transition-colors"
                >
                  <Plus size={16} />
                  <span className="text-sm">Add an exercise</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="py-3.5 bg-dark-700 text-dark-200 rounded-2xl font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || exercises.length === 0}
                  className="py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-all"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
