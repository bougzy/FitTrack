import { ISensorSnapshot, VerificationScore } from '@/types';
import { EXERCISE_CONFIGS } from './exercises';

/**
 * AI Coach — rule-based heuristic engine that analyzes a workout in flight
 * and returns natural-language coaching feedback. Designed to feel "smart"
 * without needing an external LLM call. Inputs come from the sensor stream
 * + verification engine + user state.
 */

export type CoachTone = 'positive' | 'neutral' | 'caution' | 'critical' | 'ai';

export interface CoachInsight {
  id: string;
  tone: CoachTone;
  icon: string;
  title: string;
  message: string;
  /** lower = more important */
  priority: number;
}

export interface CoachContext {
  exerciseType: string;
  reps: number;
  targetReps: number;
  durationSeconds: number;
  heartRate?: number;
  steps?: number;
  verification: VerificationScore;
  recentSnapshots: ISensorSnapshot[];
  age?: number; // optional for HR zones
}

const HR_ZONE_FLOOR = 100;

function maxHR(age = 30) {
  return 220 - age;
}

function repCadence(reps: number, durationSeconds: number) {
  if (durationSeconds < 5 || reps === 0) return null;
  return reps / (durationSeconds / 60); // reps per minute
}

function magnitudeStdDev(snaps: ISensorSnapshot[]) {
  if (snaps.length < 5) return 0;
  const mags = snaps.map((s) => {
    const a = s.accelerometer;
    return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  });
  const mean = mags.reduce((s, v) => s + v, 0) / mags.length;
  const variance = mags.reduce((s, v) => s + (v - mean) ** 2, 0) / mags.length;
  return Math.sqrt(variance);
}

/**
 * Analyse the current state and return ranked coaching insights.
 */
export function analyzeWorkout(ctx: CoachContext): CoachInsight[] {
  const insights: CoachInsight[] = [];
  const cfg = EXERCISE_CONFIGS[ctx.exerciseType];
  const cadence = repCadence(ctx.reps, ctx.durationSeconds);
  const stdDev = magnitudeStdDev(ctx.recentSnapshots);

  // ----- Cadence / pacing -----
  if (cfg?.trackingType === 'reps' && cadence !== null) {
    const idealRange = idealCadenceFor(ctx.exerciseType);
    if (idealRange) {
      const [low, high] = idealRange;
      if (cadence > high * 1.25) {
        insights.push({
          id: 'too-fast',
          tone: 'caution',
          icon: '⚡',
          title: 'Slow it down',
          message: `You're at ${Math.round(cadence)} rpm — try ${low}–${high} rpm for full range of motion.`,
          priority: 2,
        });
      } else if (cadence < low * 0.6 && ctx.durationSeconds > 20) {
        insights.push({
          id: 'too-slow',
          tone: 'neutral',
          icon: '🐢',
          title: 'Pick up the pace',
          message: `Cadence is ${Math.round(cadence)} rpm. Aim for ${low}–${high} for a stronger stimulus.`,
          priority: 3,
        });
      } else {
        insights.push({
          id: 'good-pace',
          tone: 'positive',
          icon: '✅',
          title: 'Locked in',
          message: `Pace is dialed at ${Math.round(cadence)} rpm. Keep this rhythm.`,
          priority: 5,
        });
      }
    }
  }

  // ----- Form consistency from sensor variance -----
  if (ctx.recentSnapshots.length > 15) {
    if (stdDev > 7) {
      insights.push({
        id: 'unstable-form',
        tone: 'caution',
        icon: '🎯',
        title: 'Form is shaky',
        message: 'Big variance between reps. Reset stance, breathe, and move with control.',
        priority: 2,
      });
    } else if (stdDev > 0 && stdDev < 2 && cadence && cadence > 8) {
      insights.push({
        id: 'too-stable',
        tone: 'caution',
        icon: '📐',
        title: 'Range may be short',
        message: 'Motion is unusually flat. Make sure you’re going through full range of motion, not bouncing.',
        priority: 3,
      });
    } else if (stdDev >= 2 && stdDev <= 5) {
      insights.push({
        id: 'clean-form',
        tone: 'positive',
        icon: '🧘',
        title: 'Smooth & consistent',
        message: 'Each rep looks identical. That’s the sweet spot for muscle growth.',
        priority: 5,
      });
    }
  }

  // ----- Heart rate zones -----
  if (ctx.heartRate && ctx.heartRate > HR_ZONE_FLOOR) {
    const max = maxHR(ctx.age || 30);
    const pct = (ctx.heartRate / max) * 100;
    if (pct < 60) {
      insights.push({
        id: 'hr-low',
        tone: 'neutral',
        icon: '💤',
        title: 'Warm-up zone',
        message: `${ctx.heartRate} bpm — push intensity to climb into the fat-burn zone.`,
        priority: 4,
      });
    } else if (pct < 75) {
      insights.push({
        id: 'hr-fatburn',
        tone: 'positive',
        icon: '🔥',
        title: 'Fat-burn zone',
        message: `${ctx.heartRate} bpm — perfect for endurance and conditioning.`,
        priority: 4,
      });
    } else if (pct < 85) {
      insights.push({
        id: 'hr-cardio',
        tone: 'positive',
        icon: '💪',
        title: 'Cardio zone',
        message: `${ctx.heartRate} bpm — great for VO₂max gains.`,
        priority: 3,
      });
    } else if (pct < 95) {
      insights.push({
        id: 'hr-peak',
        tone: 'caution',
        icon: '🚀',
        title: 'Peak zone',
        message: `${ctx.heartRate} bpm. Sustainable for short bursts only — drop pace soon.`,
        priority: 1,
      });
    } else {
      insights.push({
        id: 'hr-redline',
        tone: 'critical',
        icon: '🛑',
        title: 'Heart rate too high',
        message: `${ctx.heartRate} bpm is past your max. Slow down NOW and breathe.`,
        priority: 0,
      });
    }
  }

  // ----- Verification trend -----
  if (ctx.verification.total > 0 && ctx.durationSeconds > 30) {
    if (ctx.verification.total < 35) {
      insights.push({
        id: 'low-verify',
        tone: 'caution',
        icon: '🤖',
        title: 'AI confidence low',
        message: 'Sensor signal looks weak. Reposition the phone exactly as the placement guide says.',
        priority: 2,
      });
    } else if (ctx.verification.total >= 80) {
      insights.push({
        id: 'high-verify',
        tone: 'positive',
        icon: '✨',
        title: 'AI confidence high',
        message: `Verification ${ctx.verification.total}/100. This session will count, no doubt.`,
        priority: 5,
      });
    }
  }

  // ----- Progress against target -----
  if (ctx.targetReps > 0) {
    const progress = ctx.reps / ctx.targetReps;
    if (progress >= 0.5 && progress < 0.7) {
      insights.push({
        id: 'halfway',
        tone: 'ai',
        icon: '⚡',
        title: 'Halfway there',
        message: `${ctx.reps}/${ctx.targetReps} — you've got this. Stay tight.`,
        priority: 4,
      });
    } else if (progress >= 1) {
      insights.push({
        id: 'crushed',
        tone: 'positive',
        icon: '🏆',
        title: 'Target hit!',
        message: `${ctx.reps}/${ctx.targetReps} reps. Want to push for ${Math.round(ctx.targetReps * 1.5)}?`,
        priority: 1,
      });
    }
  }

  // ----- Duration milestones -----
  const milestones: Record<number, string> = {
    60: 'First minute done. Lock the breathing.',
    180: '3 minutes in — well past the warm-up.',
    300: '5 minutes — your nervous system is fully engaged.',
    600: '10 minutes. Endurance zone unlocked.',
  };
  Object.entries(milestones).forEach(([sec, msg]) => {
    const s = parseInt(sec);
    if (Math.abs(ctx.durationSeconds - s) < 3 && ctx.durationSeconds >= s) {
      insights.push({
        id: `ms-${s}`,
        tone: 'ai',
        icon: '⏱',
        title: `${Math.floor(s / 60) || s + 's'}${s >= 60 ? ' min mark' : ''}`,
        message: msg,
        priority: 3,
      });
    }
  });

  return insights.sort((a, b) => a.priority - b.priority);
}

/**
 * Return the single highest-priority insight, useful for a live banner.
 */
export function topInsight(ctx: CoachContext): CoachInsight | null {
  const list = analyzeWorkout(ctx);
  return list[0] || null;
}

/**
 * Generate a post-workout AI summary — narrative paragraph + tips.
 */
export function postWorkoutSummary(ctx: CoachContext & { calories?: number; verified: boolean }) {
  const cfg = EXERCISE_CONFIGS[ctx.exerciseType];
  const cadence = repCadence(ctx.reps, ctx.durationSeconds);
  const minutes = Math.max(1, Math.round(ctx.durationSeconds / 60));

  const insights = analyzeWorkout(ctx);

  const grade =
    ctx.verification.total >= 85
      ? 'A+'
      : ctx.verification.total >= 75
        ? 'A'
        : ctx.verification.total >= 60
          ? 'B'
          : ctx.verification.total >= 40
            ? 'C'
            : 'D';

  const headlines: string[] = [];
  if (ctx.verified) headlines.push(`AI verified this ${cfg?.label?.toLowerCase() || 'session'}.`);
  if (cadence) headlines.push(`Avg cadence ${Math.round(cadence)} reps/min.`);
  if (ctx.heartRate) headlines.push(`Peak HR around ${ctx.heartRate} bpm.`);
  if (ctx.calories) headlines.push(`~${ctx.calories} kcal burned.`);

  const tips: string[] = [];
  if (cadence) {
    const ideal = idealCadenceFor(ctx.exerciseType);
    if (ideal) {
      const [low, high] = ideal;
      if (cadence > high * 1.2) tips.push(`Slow each rep to ~${Math.round((low + high) / 2)} rpm next time for fuller ROM.`);
      else if (cadence < low) tips.push(`Try to hit ${low}+ rpm — keeps your heart rate in the training zone.`);
    }
  }
  if (ctx.verification.motionConsistency < 50) {
    tips.push('Your motion variance was high — try filming once and matching that rhythm.');
  }
  if (ctx.verification.orientationConsistency < 50) {
    tips.push('Phone moved a lot — secure it in a pocket or armband for cleaner data.');
  }
  if (ctx.heartRate && ctx.heartRate > maxHR(ctx.age || 30) * 0.9) {
    tips.push('Heart rate spent time in the peak zone — recover with light cardio for 5 min.');
  }
  if (tips.length === 0) tips.push('Solid execution. Push +10% next session — reps, weight, or pace.');

  const narrative = [
    `${minutes} min of ${cfg?.label || ctx.exerciseType.replace(/_/g, ' ')} — ${ctx.reps} reps.`,
    headlines.slice(0, 2).join(' '),
    `Form score ${ctx.verification.total}/100 (${grade}).`,
  ]
    .filter(Boolean)
    .join(' ');

  return { grade, narrative, tips, insights: insights.slice(0, 3) };
}

/**
 * AI program recommendations: pick from a curated list scored by user state.
 */
export interface ProgramTemplate {
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  exercises: { exerciseType: string; targetReps?: number; durationSeconds?: number; sets: number; restSeconds: number }[];
  tags: string[];
}

const TEMPLATES: ProgramTemplate[] = [
  {
    name: 'Morning Spark',
    description: 'A 6-minute upper-body wake-up with no equipment.',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    tags: ['quick', 'upper', 'morning'],
    exercises: [
      { exerciseType: 'jumping_jacks', targetReps: 30, sets: 1, restSeconds: 15 },
      { exerciseType: 'pushups', targetReps: 10, sets: 2, restSeconds: 30 },
      { exerciseType: 'plank', durationSeconds: 30, sets: 1, restSeconds: 30 },
    ],
  },
  {
    name: 'Core Crusher',
    description: 'Brutal 8-minute core circuit. Bring a mat.',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    tags: ['core', 'abs'],
    exercises: [
      { exerciseType: 'mountain_climbers', targetReps: 30, sets: 2, restSeconds: 20 },
      { exerciseType: 'russian_twists', targetReps: 20, sets: 2, restSeconds: 20 },
      { exerciseType: 'leg_raises', targetReps: 12, sets: 2, restSeconds: 25 },
      { exerciseType: 'plank', durationSeconds: 45, sets: 1, restSeconds: 0 },
    ],
  },
  {
    name: 'Leg Day Lite',
    description: 'Lower-body builder. Phone in pocket.',
    difficulty: 'intermediate',
    estimatedMinutes: 12,
    tags: ['legs', 'glutes'],
    exercises: [
      { exerciseType: 'squats', targetReps: 15, sets: 3, restSeconds: 45 },
      { exerciseType: 'lunges', targetReps: 12, sets: 3, restSeconds: 45 },
      { exerciseType: 'jump_squats', targetReps: 10, sets: 2, restSeconds: 60 },
      { exerciseType: 'calf_raises', targetReps: 20, sets: 2, restSeconds: 30 },
    ],
  },
  {
    name: 'HIIT 10',
    description: '10-minute fat-burning blast.',
    difficulty: 'advanced',
    estimatedMinutes: 10,
    tags: ['hiit', 'cardio', 'fat-loss'],
    exercises: [
      { exerciseType: 'burpees', targetReps: 10, sets: 3, restSeconds: 30 },
      { exerciseType: 'jumping_jacks', targetReps: 40, sets: 3, restSeconds: 20 },
      { exerciseType: 'mountain_climbers', targetReps: 30, sets: 3, restSeconds: 20 },
      { exerciseType: 'jump_squats', targetReps: 15, sets: 2, restSeconds: 30 },
    ],
  },
  {
    name: 'Builder Pro',
    description: 'Upper-body strength. 25 min, full focus.',
    difficulty: 'advanced',
    estimatedMinutes: 25,
    tags: ['strength', 'upper'],
    exercises: [
      { exerciseType: 'pushups', targetReps: 15, sets: 4, restSeconds: 60 },
      { exerciseType: 'diamond_pushups', targetReps: 8, sets: 3, restSeconds: 60 },
      { exerciseType: 'dips', targetReps: 10, sets: 3, restSeconds: 60 },
      { exerciseType: 'pullups', targetReps: 6, sets: 3, restSeconds: 90 },
    ],
  },
  {
    name: 'Cardio Cruise',
    description: 'Low-impact 20-min cardio for recovery days.',
    difficulty: 'beginner',
    estimatedMinutes: 20,
    tags: ['cardio', 'recovery'],
    exercises: [
      { exerciseType: 'jogging', durationSeconds: 600, sets: 1, restSeconds: 60 },
      { exerciseType: 'jumping_jacks', targetReps: 30, sets: 3, restSeconds: 30 },
      { exerciseType: 'calf_raises', targetReps: 25, sets: 2, restSeconds: 30 },
    ],
  },
];

interface RecommendUserState {
  level: number;
  streak: number;
  totalWorkouts: number;
  recentExerciseTypes?: string[];
}

export function recommendPrograms(user: RecommendUserState, limit = 3): (ProgramTemplate & { score: number; reason: string })[] {
  const scored = TEMPLATES.map((t) => {
    let score = 50;
    let reason = '';

    // Level → difficulty
    if (user.level <= 2 && t.difficulty === 'beginner') {
      score += 25;
      reason = 'Matched to your beginner level';
    } else if (user.level >= 3 && user.level <= 5 && t.difficulty === 'intermediate') {
      score += 25;
      reason = 'Right intensity for your level';
    } else if (user.level > 5 && t.difficulty === 'advanced') {
      score += 25;
      reason = 'Built for advanced athletes like you';
    } else if (user.level <= 2 && t.difficulty === 'advanced') {
      score -= 30;
    }

    // Streak → recovery vs intensity
    if (user.streak >= 5 && t.tags.includes('recovery')) {
      score += 15;
      if (!reason) reason = 'Active recovery for your 5+ day streak';
    }
    if (user.streak === 0 && t.tags.includes('quick')) {
      score += 10;
      if (!reason) reason = 'A quick win to restart your streak';
    }

    // Variety — penalize repeats
    if (user.recentExerciseTypes) {
      const overlap = t.exercises.filter((e) => user.recentExerciseTypes!.includes(e.exerciseType)).length;
      if (overlap >= t.exercises.length - 1) score -= 15;
    }

    if (!reason) reason = 'Recommended for variety';
    return { ...t, score, reason };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function idealCadenceFor(exerciseType: string): [number, number] | null {
  const map: Record<string, [number, number]> = {
    pushups: [25, 40],
    diamond_pushups: [20, 35],
    pullups: [12, 22],
    dips: [20, 35],
    squats: [25, 40],
    jump_squats: [30, 50],
    lunges: [20, 32],
    calf_raises: [40, 70],
    leg_raises: [15, 30],
    mountain_climbers: [60, 100],
    russian_twists: [30, 60],
    jump_rope: [80, 140],
    burpees: [10, 18],
    jumping_jacks: [60, 100],
  };
  return map[exerciseType] || null;
}
