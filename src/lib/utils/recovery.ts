/**
 * Recovery / readiness scoring — pure functions, no IO.
 *
 * The readiness score is a 0-100 number that combines subjective sleep,
 * soreness, energy, mood, and (if available) resting heart rate. It mirrors
 * the WHOOP/Oura readiness concept but built entirely on local data.
 */

export interface ReadinessInput {
  sleepHours: number;
  soreness: number; // 1-5 (5 = very sore — bad)
  energy: number; // 1-5 (5 = very energized — good)
  mood: number; // 1-5
  restingHR?: number; // optional baseline RHR; lower = better
  baselineRHR?: number; // user's typical RHR — defaults to 60 if omitted
}

export function computeReadiness(input: ReadinessInput): number {
  // Sleep contribution — sweet spot 7–9 hours
  let sleepScore = 0;
  if (input.sleepHours >= 7 && input.sleepHours <= 9) sleepScore = 100;
  else if (input.sleepHours >= 6 && input.sleepHours < 7) sleepScore = 70;
  else if (input.sleepHours > 9 && input.sleepHours <= 10) sleepScore = 80;
  else if (input.sleepHours >= 5) sleepScore = 50;
  else sleepScore = 25;

  const sorenessScore = ((6 - input.soreness) / 5) * 100; // invert: high soreness = low score
  const energyScore = (input.energy / 5) * 100;
  const moodScore = (input.mood / 5) * 100;

  let hrScore = 75;
  if (input.restingHR && input.baselineRHR) {
    const delta = input.restingHR - input.baselineRHR;
    if (delta <= 0) hrScore = 100;
    else if (delta <= 3) hrScore = 85;
    else if (delta <= 6) hrScore = 65;
    else if (delta <= 10) hrScore = 45;
    else hrScore = 25;
  } else if (input.restingHR) {
    if (input.restingHR < 55) hrScore = 100;
    else if (input.restingHR < 65) hrScore = 85;
    else if (input.restingHR < 75) hrScore = 70;
    else if (input.restingHR < 85) hrScore = 55;
    else hrScore = 35;
  }

  // Weighted blend
  const score =
    sleepScore * 0.35 +
    sorenessScore * 0.2 +
    energyScore * 0.2 +
    moodScore * 0.1 +
    hrScore * 0.15;

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function readinessTier(score: number): {
  label: string;
  emoji: string;
  recommendation: string;
  color: string;
} {
  if (score >= 85)
    return {
      label: 'Primed',
      emoji: '🔥',
      recommendation: 'Push hard today. Try a PR or a hard program.',
      color: 'green',
    };
  if (score >= 70)
    return {
      label: 'Ready',
      emoji: '💪',
      recommendation: 'Solid baseline. Hit your scheduled session.',
      color: 'green',
    };
  if (score >= 55)
    return {
      label: 'Moderate',
      emoji: '⚖️',
      recommendation: 'Train, but pull intensity back ~15%.',
      color: 'yellow',
    };
  if (score >= 40)
    return {
      label: 'Compromised',
      emoji: '⚠️',
      recommendation: 'Light cardio or mobility only. Skip heavy work.',
      color: 'orange',
    };
  return {
    label: 'Recover',
    emoji: '🛌',
    recommendation: 'Rest day. Walk, hydrate, sleep early.',
    color: 'red',
  };
}
