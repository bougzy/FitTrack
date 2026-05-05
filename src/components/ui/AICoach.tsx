'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain } from 'lucide-react';
import { CoachInsight, CoachTone } from '@/lib/utils/aiCoach';

const toneStyles: Record<CoachTone, { bg: string; border: string; text: string; ring: string }> = {
  positive: {
    bg: 'from-green-500/15 to-emerald-500/5',
    border: 'border-green-500/30',
    text: 'text-green-300',
    ring: 'shadow-[0_0_24px_rgba(34,197,94,0.25)]',
  },
  neutral: {
    bg: 'from-blue-500/15 to-cyan-500/5',
    border: 'border-blue-500/25',
    text: 'text-blue-300',
    ring: 'shadow-[0_0_24px_rgba(59,130,246,0.18)]',
  },
  caution: {
    bg: 'from-yellow-500/15 to-amber-500/5',
    border: 'border-yellow-500/30',
    text: 'text-yellow-300',
    ring: 'shadow-[0_0_24px_rgba(234,179,8,0.22)]',
  },
  critical: {
    bg: 'from-red-500/20 to-rose-500/5',
    border: 'border-red-500/40',
    text: 'text-red-300',
    ring: 'shadow-[0_0_24px_rgba(239,68,68,0.3)]',
  },
  ai: {
    bg: 'from-purple-500/15 to-indigo-500/5',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    ring: 'shadow-ai-glow',
  },
};

/** Live banner — single highest-priority insight, animated. */
export function AICoachLive({ insight }: { insight: CoachInsight | null }) {
  return (
    <AnimatePresence mode="wait">
      {insight && (
        <motion.div
          key={insight.id}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: 'spring', damping: 22, stiffness: 360 }}
          className={`relative overflow-hidden rounded-2xl border ${toneStyles[insight.tone].border} ${toneStyles[insight.tone].ring} bg-gradient-to-br ${toneStyles[insight.tone].bg} backdrop-blur-2xl px-4 py-3`}
        >
          <div className="absolute inset-0 pointer-events-none opacity-30 bg-mesh-ai" />
          <div className="relative flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center text-lg flex-shrink-0 ai-pulse`}>
              {insight.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className={toneStyles[insight.tone].text} />
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${toneStyles[insight.tone].text} opacity-80`}>
                  AI Coach
                </p>
              </div>
              <p className="font-display font-bold text-dark-50 text-sm leading-tight mt-0.5">
                {insight.title}
              </p>
              <p className="text-xs text-dark-300 leading-snug mt-0.5">{insight.message}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** End-of-workout AI summary card. */
export function AICoachSummary({
  grade,
  narrative,
  tips,
  insights,
}: {
  grade: string;
  narrative: string;
  tips: string[];
  insights: CoachInsight[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative overflow-hidden rounded-3xl border border-purple-500/25 bg-gradient-to-br from-purple-600/15 via-indigo-600/8 to-transparent backdrop-blur-2xl shadow-ai-glow p-5"
    >
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-ai-glow ai-pulse">
            <Brain size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-300/80">
              AI Performance Review
            </p>
            <h3 className="font-display text-lg font-bold text-dark-50">Coach Insights</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md flex items-center justify-center">
            <span className="font-display text-2xl font-extrabold gradient-text">{grade}</span>
          </div>
        </div>

        <p className="text-sm text-dark-100 leading-relaxed">{narrative}</p>

        {tips.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300/70">
              Tips for next time
            </p>
            {tips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex gap-2 items-start"
              >
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                <p className="text-sm text-dark-200 leading-snug">{tip}</p>
              </motion.div>
            ))}
          </div>
        )}

        {insights.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            {insights.map((ins, i) => (
              <motion.div
                key={ins.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-black/25 border ${toneStyles[ins.tone].border} backdrop-blur-md`}
              >
                <span className="text-base">{ins.icon}</span>
                <p className={`text-xs font-semibold ${toneStyles[ins.tone].text}`}>{ins.title}</p>
                <p className="text-xs text-dark-300 truncate flex-1">{ins.message}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Static AI-recommended program card. */
export function AIRecommendCard({
  name,
  description,
  difficulty,
  estimatedMinutes,
  reason,
  onClick,
}: {
  name: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  reason: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden text-left w-full rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent backdrop-blur-xl p-4 lift"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />
      <div className="relative space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300/80">
          <Sparkles size={10} />
          AI Pick · {reason}
        </div>
        <p className="font-display font-bold text-dark-50">{name}</p>
        <p className="text-xs text-dark-300 leading-snug line-clamp-2">{description}</p>
        <div className="flex gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-black/30 text-dark-300 capitalize">{difficulty}</span>
          <span className="px-2 py-0.5 rounded-md bg-black/30 text-dark-300">~{estimatedMinutes} min</span>
        </div>
      </div>
    </motion.button>
  );
}
