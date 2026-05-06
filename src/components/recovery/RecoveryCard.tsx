'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '@/hooks/useApi';
import { readinessTier } from '@/lib/utils/recovery';
import { Moon, Battery, Smile, Activity, Heart } from 'lucide-react';

const tierColors: Record<string, string> = {
  green: 'from-green-500/20 to-emerald-500/5 border-green-500/30 text-green-300',
  yellow: 'from-yellow-500/20 to-amber-500/5 border-yellow-500/30 text-yellow-300',
  orange: 'from-orange-500/20 to-rose-500/5 border-orange-500/30 text-orange-300',
  red: 'from-red-500/20 to-rose-500/5 border-red-500/30 text-red-300',
};

export function RecoveryCard() {
  const { request } = useApi();
  const [data, setData] = useState<any>(null);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    const res = await request<any>('/api/recovery?days=7', { showError: false });
    if (res?.success) setData(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const today = data?.today;
  const tier = readinessTier(today?.readinessScore || 0);

  return (
    <div>
      {today ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border bg-gradient-to-br ${tierColors[tier.color]} backdrop-blur-md p-4`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold opacity-80">
                <Heart size={11} />
                Readiness
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-3xl font-extrabold text-dark-50">{today.readinessScore}</span>
                <span className="text-sm opacity-80">/ 100</span>
              </div>
              <p className="text-xs text-dark-300 mt-1">
                {tier.emoji} <strong className={tier.color === 'green' ? 'text-green-200' : ''}>{tier.label}</strong> — {tier.recommendation}
              </p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white/10 backdrop-blur-md border border-white/15 text-dark-100"
            >
              Update
            </button>
          </div>
          {data?.avgReadiness !== null && data?.history?.length > 1 && (
            <div className="mt-3 flex items-center gap-2 text-[10px] text-dark-400">
              <span>7-day avg:</span>
              <span className="font-semibold text-dark-200">{data.avgReadiness}</span>
            </div>
          )}
        </motion.div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full glass-card rounded-2xl p-4 text-left lift"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-700/20 border border-white/10 flex items-center justify-center">
              <Heart size={20} className="text-blue-300" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-dark-50">Daily Recovery Check-in</p>
              <p className="text-xs text-dark-400 mt-0.5">
                30 seconds. Lets the AI coach pick the right intensity for you.
              </p>
            </div>
          </div>
        </button>
      )}

      <AnimatePresence>
        {editing && (
          <RecoveryModal
            initial={today}
            onClose={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RecoveryModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { request, loading } = useApi();
  const [form, setForm] = useState({
    sleepHours: initial?.sleepHours ?? 7,
    soreness: initial?.soreness ?? 3,
    energy: initial?.energy ?? 3,
    mood: initial?.mood ?? 3,
    restingHR: initial?.restingHR ?? '',
    notes: initial?.notes ?? '',
  });

  const submit = async () => {
    const res = await request<any>('/api/recovery', {
      method: 'POST',
      body: {
        ...form,
        restingHR: form.restingHR === '' ? undefined : Number(form.restingHR),
      },
    });
    if (res?.success) {
      toast.success(`Readiness ${res.data.readinessScore}/100`);
      onSaved();
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
          <h3 className="font-display text-lg font-bold text-dark-50">Daily Recovery Check-in</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 text-dark-300 text-sm"
          >
            ×
          </button>
        </div>
        <div className="px-6 pt-4 space-y-4">
          <SliderRow
            icon={<Moon size={16} className="text-blue-300" />}
            label="Sleep"
            value={form.sleepHours}
            min={3}
            max={12}
            step={0.5}
            unit="hours"
            onChange={(v) => setForm({ ...form, sleepHours: v })}
          />
          <RatingRow
            icon={<Activity size={16} className="text-orange-300" />}
            label="Soreness"
            value={form.soreness}
            hint={['None', 'Light', 'Moderate', 'Heavy', 'Severe']}
            onChange={(v) => setForm({ ...form, soreness: v })}
          />
          <RatingRow
            icon={<Battery size={16} className="text-green-300" />}
            label="Energy"
            value={form.energy}
            hint={['Drained', 'Low', 'Okay', 'Good', 'Buzzing']}
            onChange={(v) => setForm({ ...form, energy: v })}
          />
          <RatingRow
            icon={<Smile size={16} className="text-yellow-300" />}
            label="Mood"
            value={form.mood}
            hint={['😞', '😐', '🙂', '😊', '🤩']}
            onChange={(v) => setForm({ ...form, mood: v })}
          />
          <div>
            <label className="text-xs uppercase tracking-wider text-dark-400 font-semibold flex items-center gap-1">
              <Heart size={12} className="text-red-400" />
              Resting HR (optional)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={30}
              max={120}
              placeholder="e.g. 60"
              value={form.restingHR}
              onChange={(e) => setForm({ ...form, restingHR: e.target.value as any })}
              className="mt-1 w-full bg-dark-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-display font-bold text-white shadow-brand-glow"
            style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 55%, #7e22ce 100%)' }}
          >
            {loading ? 'Saving…' : 'Save Check-in'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SliderRow({
  icon,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-dark-200 font-medium">
          {icon}
          {label}
        </div>
        <span className="font-display text-base font-bold text-dark-50">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

function RatingRow({
  icon,
  label,
  value,
  hint,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string[];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-dark-200 font-medium">
          {icon}
          {label}
        </div>
        <span className="text-xs text-dark-400">{hint[value - 1]}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              value === n ? 'bg-brand-500 text-white shadow-brand-glow' : 'bg-white/5 text-dark-300 border border-white/10'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
