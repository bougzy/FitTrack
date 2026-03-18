import { ExerciseConfig, ExerciseType } from '@/types';

export const EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  pushups: {
    type: 'pushups',
    label: 'Push-ups',
    category: 'calisthenics',
    icon: '💪',
    trackingType: 'reps',
    phonePosition: 'Place phone flat on the floor beside your right hand',
    motionAxis: 'z',
    caloriesPerRep: 0.32,
    primaryMuscles: ['chest', 'triceps', 'shoulders'],
  },
  diamond_pushups: {
    type: 'diamond_pushups',
    label: 'Diamond Push-ups',
    category: 'calisthenics',
    icon: '💎',
    trackingType: 'reps',
    phonePosition: 'Place phone flat on the floor beside your right hand',
    motionAxis: 'z',
    caloriesPerRep: 0.38,
    primaryMuscles: ['triceps', 'chest', 'shoulders'],
  },
  pullups: {
    type: 'pullups',
    label: 'Pull-ups',
    category: 'calisthenics',
    icon: '🏋️',
    trackingType: 'reps',
    phonePosition: 'Place phone in your pocket or waistband',
    motionAxis: 'y',
    caloriesPerRep: 0.45,
    primaryMuscles: ['back', 'biceps'],
  },
  dips: {
    type: 'dips',
    label: 'Dips',
    category: 'calisthenics',
    icon: '⬇️',
    trackingType: 'reps',
    phonePosition: 'Place phone in your pocket',
    motionAxis: 'y',
    caloriesPerRep: 0.4,
    primaryMuscles: ['triceps', 'chest', 'shoulders'],
  },
  handstand_pushups: {
    type: 'handstand_pushups',
    label: 'Handstand Push-ups',
    category: 'calisthenics',
    icon: '🤸',
    trackingType: 'reps',
    phonePosition: 'Place phone on the floor facing you',
    motionAxis: 'z',
    caloriesPerRep: 0.5,
    primaryMuscles: ['shoulders', 'triceps', 'core'],
  },
  squats: {
    type: 'squats',
    label: 'Squats',
    category: 'legs',
    icon: '🦵',
    trackingType: 'reps',
    phonePosition: 'Place phone in pocket or on a stable surface in front of you',
    motionAxis: 'y',
    caloriesPerRep: 0.32,
    primaryMuscles: ['quads', 'glutes', 'hamstrings'],
  },
  jump_squats: {
    type: 'jump_squats',
    label: 'Jump Squats',
    category: 'legs',
    icon: '⬆️',
    trackingType: 'reps',
    phonePosition: 'Place phone in pocket',
    motionAxis: 'y',
    caloriesPerRep: 0.5,
    primaryMuscles: ['quads', 'glutes', 'calves'],
  },
  lunges: {
    type: 'lunges',
    label: 'Lunges',
    category: 'legs',
    icon: '🚶',
    trackingType: 'reps',
    phonePosition: 'Place phone in pocket',
    motionAxis: 'y',
    caloriesPerRep: 0.3,
    primaryMuscles: ['quads', 'glutes'],
  },
  wall_sit: {
    type: 'wall_sit',
    label: 'Wall Sit',
    category: 'legs',
    icon: '🧱',
    trackingType: 'duration',
    phonePosition: 'Place phone in pocket or hold it',
    motionAxis: 'x',
    caloriesPerMinute: 5,
    primaryMuscles: ['quads', 'glutes'],
  },
  calf_raises: {
    type: 'calf_raises',
    label: 'Calf Raises',
    category: 'legs',
    icon: '👟',
    trackingType: 'reps',
    phonePosition: 'Place phone in pocket',
    motionAxis: 'y',
    caloriesPerRep: 0.15,
    primaryMuscles: ['calves'],
  },
  plank: {
    type: 'plank',
    label: 'Plank',
    category: 'core',
    icon: '🏃',
    trackingType: 'duration',
    phonePosition: 'Place phone flat on the floor under your face',
    motionAxis: 'x',
    caloriesPerMinute: 4,
    primaryMuscles: ['core', 'shoulders'],
  },
  leg_raises: {
    type: 'leg_raises',
    label: 'Leg Raises',
    category: 'core',
    icon: '🦶',
    trackingType: 'reps',
    phonePosition: 'Place phone in pocket or on your hip',
    motionAxis: 'y',
    caloriesPerRep: 0.28,
    primaryMuscles: ['core', 'hip flexors'],
  },
  mountain_climbers: {
    type: 'mountain_climbers',
    label: 'Mountain Climbers',
    category: 'core',
    icon: '⛰️',
    trackingType: 'reps',
    phonePosition: 'Place phone flat on the floor beside your hand',
    motionAxis: 'z',
    caloriesPerRep: 0.25,
    primaryMuscles: ['core', 'chest', 'legs'],
  },
  russian_twists: {
    type: 'russian_twists',
    label: 'Russian Twists',
    category: 'core',
    icon: '🌀',
    trackingType: 'reps',
    phonePosition: 'Hold phone in both hands while exercising',
    motionAxis: 'x',
    caloriesPerRep: 0.2,
    primaryMuscles: ['obliques', 'core'],
  },
  jogging: {
    type: 'jogging',
    label: 'Jogging',
    category: 'cardio',
    icon: '🏃‍♂️',
    trackingType: 'duration',
    phonePosition: 'Keep phone in pocket, armband, or belt clip',
    motionAxis: 'all',
    caloriesPerMinute: 8,
    primaryMuscles: ['legs', 'cardio'],
  },
  running: {
    type: 'running',
    label: 'Running',
    category: 'cardio',
    icon: '🏅',
    trackingType: 'duration',
    phonePosition: 'Keep phone in pocket, armband, or belt clip',
    motionAxis: 'all',
    caloriesPerMinute: 12,
    primaryMuscles: ['legs', 'cardio'],
  },
  jump_rope: {
    type: 'jump_rope',
    label: 'Jump Rope',
    category: 'cardio',
    icon: '🪢',
    trackingType: 'reps',
    phonePosition: 'Place phone in pocket',
    motionAxis: 'y',
    caloriesPerRep: 0.1,
    primaryMuscles: ['calves', 'cardio', 'shoulders'],
  },
  burpees: {
    type: 'burpees',
    label: 'Burpees',
    category: 'cardio',
    icon: '🔥',
    trackingType: 'reps',
    phonePosition: 'Place phone on the floor beside your hand',
    motionAxis: 'z',
    caloriesPerRep: 0.55,
    primaryMuscles: ['full body', 'cardio'],
  },
  jumping_jacks: {
    type: 'jumping_jacks',
    label: 'Jumping Jacks',
    category: 'cardio',
    icon: '⭐',
    trackingType: 'reps',
    phonePosition: 'Place phone in pocket',
    motionAxis: 'y',
    caloriesPerRep: 0.2,
    primaryMuscles: ['cardio', 'legs', 'shoulders'],
  },
  custom: {
    type: 'custom',
    label: 'Custom Exercise',
    category: 'custom',
    icon: '🎯',
    trackingType: 'both',
    phonePosition: 'Place phone where most stable',
    motionAxis: 'all',
    caloriesPerRep: 0.3,
    primaryMuscles: ['various'],
  },
};

export function calculateCalories(
  exerciseType: string,
  reps: number,
  durationSeconds: number
): number {
  const config = EXERCISE_CONFIGS[exerciseType];
  if (!config) return 0;

  if (config.trackingType === 'duration' && config.caloriesPerMinute) {
    return Math.round((durationSeconds / 60) * config.caloriesPerMinute);
  } else if (config.caloriesPerRep) {
    return Math.round(reps * config.caloriesPerRep);
  }
  return 0;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export function getExercisesByCategory() {
  const grouped: Record<string, ExerciseConfig[]> = {};
  Object.values(EXERCISE_CONFIGS).forEach((cfg) => {
    if (!grouped[cfg.category]) grouped[cfg.category] = [];
    grouped[cfg.category].push(cfg);
  });
  return grouped;
}
