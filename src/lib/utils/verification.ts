import { ISensorSnapshot, VerificationScore } from '@/types';

// ============================================
// ANTI-CHEAT VERIFICATION ENGINE
// Sensor fusion: accelerometer + gyroscope + orientation + GPS
// ============================================

interface MotionEvent {
  timestamp: number;
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

export function calculateMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

export function detectRepetitions(
  events: MotionEvent[],
  threshold: number = 12
): number {
  if (events.length < 10) return 0;

  let repCount = 0;
  let aboveThreshold = false;
  let belowThreshold = false;

  for (let i = 1; i < events.length; i++) {
    const mag = events[i].magnitude;

    if (mag > threshold && !aboveThreshold) {
      aboveThreshold = true;
      belowThreshold = false;
    } else if (mag < threshold / 2 && aboveThreshold && !belowThreshold) {
      belowThreshold = true;
      aboveThreshold = false;
      repCount++;
    }
  }

  return repCount;
}

export function calculateMotionConsistency(events: MotionEvent[]): number {
  if (events.length < 5) return 0;

  const magnitudes = events.map((e) => e.magnitude);
  const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const variance =
    magnitudes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / magnitudes.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100; // coefficient of variation

  // Lower CV = more consistent motion
  if (cv < 20) return 100;
  if (cv < 40) return 80;
  if (cv < 60) return 60;
  if (cv < 80) return 40;
  return 20;
}

export function calculateRepetitionPatternAccuracy(
  events: MotionEvent[],
  expectedReps: number
): number {
  if (expectedReps === 0) return 50;

  const detectedReps = detectRepetitions(events);
  if (detectedReps === 0) return 0;

  const ratio = Math.min(detectedReps, expectedReps) / Math.max(detectedReps, expectedReps);
  return Math.round(ratio * 100);
}

export function calculateOrientationConsistency(snapshots: ISensorSnapshot[]): number {
  if (snapshots.length < 5) return 50;

  const orientations = snapshots
    .filter((s) => s.orientation)
    .map((s) => s.orientation!);

  if (orientations.length < 5) return 50;

  const betaValues = orientations.map((o) => o.beta);
  const mean = betaValues.reduce((a, b) => a + b, 0) / betaValues.length;
  const variance =
    betaValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / betaValues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev < 10) return 100;
  if (stdDev < 25) return 80;
  if (stdDev < 45) return 60;
  if (stdDev < 70) return 40;
  return 20;
}

export function calculateSessionDurationScore(
  durationSeconds: number,
  exerciseType: string
): number {
  const minimumDurations: Record<string, number> = {
    pushups: 30,
    squats: 30,
    plank: 30,
    jogging: 300,
    running: 300,
    burpees: 60,
    default: 45,
  };

  const minDuration = minimumDurations[exerciseType] || minimumDurations.default;

  if (durationSeconds >= minDuration * 3) return 100;
  if (durationSeconds >= minDuration * 2) return 85;
  if (durationSeconds >= minDuration) return 70;
  if (durationSeconds >= minDuration * 0.5) return 40;
  return 10;
}

export function calculateIntensityScore(events: MotionEvent[]): number {
  if (events.length < 5) return 0;

  const magnitudes = events.map((e) => e.magnitude);
  const maxMag = Math.max(...magnitudes);
  const avgMag = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;

  // Score based on intensity distribution
  const peakRatio = maxMag / (avgMag || 1);

  if (peakRatio >= 3 && avgMag >= 8) return 100;
  if (peakRatio >= 2.5 && avgMag >= 6) return 80;
  if (peakRatio >= 2 && avgMag >= 4) return 60;
  if (peakRatio >= 1.5) return 40;
  return 20;
}

export function computeVerificationScore(
  snapshots: ISensorSnapshot[],
  durationSeconds: number,
  reps: number,
  exerciseType: string,
  partnerConfirmed: boolean = false
): VerificationScore {
  const events: MotionEvent[] = snapshots.map((s) => ({
    timestamp: s.timestamp,
    x: s.accelerometer.x,
    y: s.accelerometer.y,
    z: s.accelerometer.z,
    magnitude: calculateMagnitude(s.accelerometer.x, s.accelerometer.y, s.accelerometer.z),
  }));

  const motionConsistency = calculateMotionConsistency(events) * 0.25;
  const repetitionPatternAccuracy = calculateRepetitionPatternAccuracy(events, reps) * 0.25;
  const orientationConsistency = calculateOrientationConsistency(snapshots) * 0.15;
  const sessionDuration = calculateSessionDurationScore(durationSeconds, exerciseType) * 0.15;
  const intensityScore = calculateIntensityScore(events) * 0.1;
  const partnerConfirmation = partnerConfirmed ? 10 : 0;

  const total = Math.min(
    100,
    Math.round(
      motionConsistency +
        repetitionPatternAccuracy +
        orientationConsistency +
        sessionDuration +
        intensityScore +
        partnerConfirmation
    )
  );

  return {
    total,
    motionConsistency: Math.round(motionConsistency / 0.25),
    repetitionPatternAccuracy: Math.round(repetitionPatternAccuracy / 0.25),
    orientationConsistency: Math.round(orientationConsistency / 0.15),
    sessionDuration: Math.round(sessionDuration / 0.15),
    intensityScore: Math.round(intensityScore / 0.1),
    partnerConfirmation: partnerConfirmed ? 100 : 0,
  };
}

export function getVerificationLevel(snapshots: ISensorSnapshot[]): 1 | 2 | 3 {
  const hasGoodMotion = snapshots.length > 20;
  // In real implementation, level 3 would require camera pose detection
  if (!hasGoodMotion) return 1;
  if (hasGoodMotion) return 2;
  return 3;
}

export function isVerified(score: number): boolean {
  return score >= 60;
}

// Anti-cheat: Generate random prompts during workout
export function generateAntiCheatPrompts(exerciseType: string): string[] {
  const basePrompts = [
    'Show thumbs up to the camera!',
    'Wave your left hand!',
    'Tap the screen 3 times quickly!',
    'Say "FitTrack" out loud!',
    'Hold your phone up for 2 seconds!',
  ];

  const exerciseSpecific: Record<string, string[]> = {
    pushups: [
      'Shake the phone to confirm rep count!',
      'Rest position - wait for next prompt',
    ],
    squats: ['Stand up straight and shake phone!', 'Step to the left once!'],
    jogging: ['Clap your hands twice!', 'Raise your arms above your head!'],
  };

  const specific = exerciseSpecific[exerciseType] || [];
  return [...basePrompts, ...specific];
}
