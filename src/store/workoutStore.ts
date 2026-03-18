import { create } from 'zustand';
import { WorkoutSession, ExerciseType, ISensorSnapshot, VerificationScore } from '@/types';

interface WorkoutStore {
  session: WorkoutSession | null;
  isRecording: boolean;
  antiCheatPrompt: string | null;
  startSession: (exerciseType: ExerciseType, selectedGroups: string[], targetReps: number) => void;
  stopSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  incrementRep: () => void;
  addSensorSnapshot: (snapshot: ISensorSnapshot) => void;
  updateVerificationScore: (score: VerificationScore) => void;
  updateDuration: (seconds: number) => void;
  setAntiCheatPrompt: (prompt: string | null) => void;
  completeSet: () => void;
  reset: () => void;
}

const defaultSession = (): WorkoutSession => ({
  exerciseType: 'pushups',
  startTime: Date.now(),
  reps: 0,
  sets: 1,
  duration: 0,
  isActive: false,
  isPaused: false,
  selectedGroups: [],
  sensorReadings: [],
  verificationScore: {
    total: 0,
    motionConsistency: 0,
    repetitionPatternAccuracy: 0,
    orientationConsistency: 0,
    sessionDuration: 0,
    intensityScore: 0,
    partnerConfirmation: 0,
  },
  currentSet: 1,
  targetReps: 10,
});

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  session: null,
  isRecording: false,
  antiCheatPrompt: null,

  startSession: (exerciseType, selectedGroups, targetReps) => {
    set({
      session: {
        ...defaultSession(),
        exerciseType,
        selectedGroups,
        targetReps,
        startTime: Date.now(),
        isActive: true,
        isPaused: false,
      },
      isRecording: true,
    });
  },

  stopSession: () => {
    set({ isRecording: false });
  },

  pauseSession: () => {
    const { session } = get();
    if (session) set({ session: { ...session, isPaused: true } });
  },

  resumeSession: () => {
    const { session } = get();
    if (session) set({ session: { ...session, isPaused: false } });
  },

  incrementRep: () => {
    const { session } = get();
    if (session && !session.isPaused) {
      set({ session: { ...session, reps: session.reps + 1 } });
    }
  },

  addSensorSnapshot: (snapshot) => {
    const { session } = get();
    if (session && !session.isPaused) {
      const readings = [...session.sensorReadings, snapshot];
      // Keep last 300 readings to avoid memory issues
      const trimmed = readings.slice(-300);
      set({ session: { ...session, sensorReadings: trimmed } });
    }
  },

  updateVerificationScore: (score) => {
    const { session } = get();
    if (session) set({ session: { ...session, verificationScore: score } });
  },

  updateDuration: (seconds) => {
    const { session } = get();
    if (session) set({ session: { ...session, duration: seconds } });
  },

  setAntiCheatPrompt: (prompt) => {
    set({ antiCheatPrompt: prompt });
  },

  completeSet: () => {
    const { session } = get();
    if (session) {
      set({
        session: {
          ...session,
          currentSet: session.currentSet + 1,
          sets: session.currentSet + 1,
          reps: 0,
        },
      });
    }
  },

  reset: () => {
    set({ session: null, isRecording: false, antiCheatPrompt: null });
  },
}));
