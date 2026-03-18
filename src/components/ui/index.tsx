'use client';

import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

// ============ CARD ============
export function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-dark-800 border border-dark-700 rounded-2xl p-4',
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform exercise-card',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============ STAT CARD ============
export function StatCard({ label, value, icon, sub, color = 'brand' }: {
  label: string; value: string | number; icon: string; sub?: string; color?: string;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-${color}-500/15 flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-dark-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="font-display text-2xl font-bold text-dark-50 leading-tight">{value}</p>
        {sub && <p className="text-dark-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

// ============ BADGE ============
export function BadgeChip({ icon, name, earned }: { icon: string; name: string; earned?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border transition-all', earned ? 'bg-brand-500/10 border-brand-500/30' : 'bg-dark-800 border-dark-700 opacity-40')}>
      <span className="text-2xl">{icon}</span>
      <span className="text-[10px] text-center text-dark-300 font-medium leading-tight">{name}</span>
    </div>
  );
}

// ============ VERIFICATION SCORE ============
export function VerificationBadge({ score, verified }: { score: number; verified: boolean }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${verified ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
      {verified ? '✅' : '⚠️'}
      <span>{score}/100</span>
    </div>
  );
}

// ============ PROGRESS RING ============
export function ProgressRing({ value, max, size = 80, strokeWidth = 6, children }: {
  value: number; max: number; size?: number; strokeWidth?: number; children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference - pct * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="progress-ring-track" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          strokeWidth={strokeWidth}
          stroke="#f97316"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ============ STREAK DISPLAY ============
export function StreakDisplay({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl streak-fire">🔥</span>
      <div>
        <span className="font-display text-2xl font-bold text-brand-400">{streak}</span>
        <span className="text-dark-400 text-sm ml-1">day streak</span>
      </div>
    </div>
  );
}

// ============ LEVEL BADGE ============
export function LevelBadge({ level, xp }: { level: number; xp: number }) {
  const xpForNext = level * 500;
  const xpInLevel = xp % 500;
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
        <span className="font-display font-bold text-white text-sm">{level}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-dark-400">Level {level}</p>
        <div className="h-1.5 bg-dark-700 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(xpInLevel / 500) * 100}%` }} />
        </div>
        <p className="text-[10px] text-dark-500 mt-0.5">{xpInLevel} / 500 XP</p>
      </div>
    </div>
  );
}

// ============ SKELETON LOADER ============
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

// ============ EMPTY STATE ============
export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-5xl mb-4 opacity-50">{icon}</span>
      <h3 className="font-display text-lg font-semibold text-dark-200 mb-2">{title}</h3>
      {description && <p className="text-dark-400 text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
