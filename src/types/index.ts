// ============================================
// FITTRACK - Global Types
// ============================================

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  level: number;
  xp: number;
  groups: string[];
  accountabilityPartners: string[];
  badges: IBadge[];
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserPreferences {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredExercises: string[];
  reminderTime: string;
  darkMode: boolean;
  notificationsEnabled: boolean;
}

export interface IBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

export interface IExerciseSession {
  _id: string;
  userId: string;
  exerciseType: ExerciseType;
  duration: number; // seconds
  reps: number;
  sets: number;
  motionScore: number;
  verificationScore: number;
  verified: boolean;
  verificationLevel: 1 | 2 | 3;
  caloriesBurned: number;
  sharedGroups: string[];
  notes: string;
  date: Date;
  sensorData?: ISensorSnapshot[];
  createdAt: Date;
}

export interface ISensorSnapshot {
  timestamp: number;
  accelerometer: { x: number; y: number; z: number };
  gyroscope?: { x: number; y: number; z: number };
  orientation?: { alpha: number; beta: number; gamma: number };
  gps?: { lat: number; lng: number; speed: number };
}

export interface IAccountabilityGroup {
  _id: string;
  name: string;
  description: string;
  owner: string;
  members: IGroupMember[];
  privacy: 'private' | 'public';
  autoAccept: boolean;
  inviteCode: string;
  challenges: IChallenge[];
  category: string;
  totalWorkouts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  streak: number;
  totalWorkouts: number;
}

export interface IChallenge {
  _id: string;
  name: string;
  description: string;
  type: 'reps' | 'duration' | 'streak' | 'workouts';
  target: number;
  startDate: Date;
  endDate: Date;
  participants: IChallengeParticipant[];
  active: boolean;
}

export interface IChallengeParticipant {
  userId: string;
  progress: number;
  completed: boolean;
}

export interface IGroupInvitation {
  _id: string;
  groupId: string;
  inviterId: string;
  inviteeId: string;
  inviteeEmail?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

export type NotificationType =
  | 'workout_shared'
  | 'group_invite'
  | 'group_join_request'
  | 'streak_milestone'
  | 'badge_earned'
  | 'challenge_started'
  | 'challenge_completed'
  | 'missed_workout'
  | 'partner_workout'
  | 'system';

export type ExerciseType =
  // Calisthenics
  | 'pushups'
  | 'diamond_pushups'
  | 'pullups'
  | 'dips'
  | 'handstand_pushups'
  // Legs
  | 'squats'
  | 'jump_squats'
  | 'lunges'
  | 'wall_sit'
  | 'calf_raises'
  // Core
  | 'plank'
  | 'leg_raises'
  | 'mountain_climbers'
  | 'russian_twists'
  // Cardio
  | 'jogging'
  | 'running'
  | 'jump_rope'
  | 'burpees'
  | 'jumping_jacks'
  // Custom
  | 'custom';

export interface ExerciseConfig {
  type: ExerciseType;
  label: string;
  category: 'calisthenics' | 'legs' | 'core' | 'cardio' | 'custom';
  icon: string;
  trackingType: 'reps' | 'duration' | 'both';
  phonePosition: string;
  motionAxis: string;
  caloriesPerRep?: number;
  caloriesPerMinute?: number;
  primaryMuscles: string[];
}

export interface VerificationScore {
  total: number;
  motionConsistency: number;
  repetitionPatternAccuracy: number;
  orientationConsistency: number;
  sessionDuration: number;
  intensityScore: number;
  partnerConfirmation: number;
}

export interface WorkoutSession {
  exerciseType: ExerciseType;
  startTime: number;
  reps: number;
  sets: number;
  duration: number;
  isActive: boolean;
  isPaused: boolean;
  selectedGroups: string[];
  sensorReadings: ISensorSnapshot[];
  verificationScore: VerificationScore;
  currentSet: number;
  targetReps: number;
}

export interface DailyReport {
  date: string;
  userId: string;
  userName: string;
  sessions: IExerciseSession[];
  totalDuration: number;
  totalReps: number;
  totalCalories: number;
  averageVerification: number;
  streak: number;
  badges: IBadge[];
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalWorkouts: number;
  totalReps: number;
  streak: number;
  xp: number;
  level: number;
  rank: number;
}

export interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
