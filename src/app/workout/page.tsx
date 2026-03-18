'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useApi } from '@/hooks/useApi';
import { useSensors } from '@/hooks/useSensors';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { AppShell } from '@/components/ui/AppShell';
import { Card, ProgressRing, VerificationBadge } from '@/components/ui/index';
import { EXERCISE_CONFIGS, getExercisesByCategory, formatDuration } from '@/lib/utils/exercises';
import { computeVerificationScore } from '@/lib/utils/verification';
import { generateAntiCheatPrompts } from '@/lib/utils/verification';
import { Play, Pause, Square, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { ISensorSnapshot } from '@/types';

type WorkoutPhase = 'select' | 'setup' | 'active' | 'complete';

export default function WorkoutPage() {
  const { user, updateUser } = useAuthStore();
  const { session, startSession, stopSession, pauseSession, resumeSession, incrementRep, addSensorSnapshot, updateVerificationScore, updateDuration, setAntiCheatPrompt, reset } = useWorkoutStore();
  const { request } = useApi();

  const [phase, setPhase] = useState<WorkoutPhase>('select');
  const [selectedExercise, setSelectedExercise] = useState('pushups');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [targetReps, setTargetReps] = useState(10);
  const [result, setResult] = useState<any>(null);
  const [antiCheatVisible, setAntiCheatVisible] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const antiCheatTimerRef = useRef<NodeJS.Timeout>();
  const verificationIntervalRef = useRef<NodeJS.Timeout>();
  const snapshotsRef = useRef<ISensorSnapshot[]>([]);

  const isActive = session?.isActive || false;
  const isPaused = session?.isPaused || false;
  const { seconds, formattedTime, reset: resetTimer } = useWorkoutTimer(isActive, isPaused);

  // Fetch groups
  useEffect(() => {
    request<any>('/api/groups').then(res => {
      if (res?.success) setMyGroups(res.data);
    });
  }, []);

  // Sensor hook
  const handleSnapshot = useCallback((snap: ISensorSnapshot) => {
    snapshotsRef.current.push(snap);
    addSensorSnapshot(snap);
  }, [addSensorSnapshot]);

  const handleRepDetected = useCallback(() => {
    incrementRep();
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
  }, [incrementRep]);

  const { startTracking, stopTracking } = useSensors({
    onSnapshot: handleSnapshot,
    onRepDetected: handleRepDetected,
    exerciseType: selectedExercise,
  });

  // Update duration in store every second
  useEffect(() => {
    if (isActive && !isPaused) {
      updateDuration(seconds);
    }
  }, [seconds, isActive, isPaused, updateDuration]);

  // Update verification score every 5 seconds
  useEffect(() => {
    if (!isActive) return;
    verificationIntervalRef.current = setInterval(() => {
      if (snapshotsRef.current.length > 5 && session) {
        const score = computeVerificationScore(
          snapshotsRef.current,
          seconds,
          session.reps,
          selectedExercise
        );
        updateVerificationScore(score);
      }
    }, 5000);
    return () => clearInterval(verificationIntervalRef.current);
  }, [isActive, seconds, selectedExercise, session, updateVerificationScore]);

  // Anti-cheat random prompts
  useEffect(() => {
    if (!isActive || isPaused) {
      clearTimeout(antiCheatTimerRef.current);
      return;
    }
    const prompts = generateAntiCheatPrompts(selectedExercise);
    const schedulePrompt = () => {
      const delay = 30000 + Math.random() * 60000; // 30-90 seconds
      antiCheatTimerRef.current = setTimeout(() => {
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        setCurrentPrompt(prompt);
        setAntiCheatVisible(true);
        setAntiCheatPrompt(prompt);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setTimeout(() => {
          setAntiCheatVisible(false);
          setAntiCheatPrompt(null);
          schedulePrompt();
        }, 5000);
      }, delay);
    };
    schedulePrompt();
    return () => clearTimeout(antiCheatTimerRef.current);
  }, [isActive, isPaused, selectedExercise, setAntiCheatPrompt]);

  const handleStart = async () => {
    snapshotsRef.current = [];
    startSession(selectedExercise as any, selectedGroups, targetReps);
    setPhase('active');
    await startTracking();
    resetTimer();
  };

  const handleFinish = async () => {
    stopTracking();
    clearTimeout(antiCheatTimerRef.current);
    clearInterval(verificationIntervalRef.current);
    stopSession();

    // Final verification
    const finalScore = computeVerificationScore(
      snapshotsRef.current,
      seconds,
      session?.reps || 0,
      selectedExercise
    );

    const res = await request<any>('/api/sessions', {
      method: 'POST',
      body: {
        exerciseType: selectedExercise,
        duration: seconds,
        reps: session?.reps || 0,
        sets: session?.sets || 1,
        sharedGroups: selectedGroups,
        sensorData: snapshotsRef.current.slice(-100),
      },
    });

    if (res?.success) {
      setResult(res.data);
      setPhase('complete');
      // Update local user stats
      if (user) {
        updateUser({ totalWorkouts: (user.totalWorkouts || 0) + 1 });
      }
      toast.success(res.message || 'Workout saved!');
    }
    reset();
  };

  const handlePauseResume = () => {
    if (isPaused) resumeSession();
    else pauseSession();
  };

  const exercisesByCategory = getExercisesByCategory();
  const config = EXERCISE_CONFIGS[selectedExercise];

  return (
    <AppShell title={phase === 'active' ? undefined : 'Workout'} showBack={phase !== 'select' && phase !== 'complete'}>
      <AnimatePresence mode="wait">
        {/* ---- EXERCISE SELECTION ---- */}
        {phase === 'select' && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 space-y-5 pb-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-dark-50 mb-1">Choose Exercise</h2>
              <p className="text-dark-400 text-sm">What are you training today?</p>
            </div>

            {Object.entries(exercisesByCategory).map(([category, exercises]) => (
              <div key={category}>
                <h3 className="font-display text-xs uppercase tracking-widest text-dark-500 mb-2 font-semibold">
                  {category}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {exercises.map((ex) => (
                    <button
                      key={ex.type}
                      onClick={() => setSelectedExercise(ex.type)}
                      className={`p-3 rounded-xl border text-left transition-all active:scale-95 ${
                        selectedExercise === ex.type
                          ? 'bg-brand-500/15 border-brand-500/50 shadow-lg shadow-brand-500/10'
                          : 'bg-dark-800 border-dark-700'
                      }`}
                    >
                      <span className="text-2xl">{ex.icon}</span>
                      <p className="font-medium text-sm text-dark-100 mt-1 leading-tight">{ex.label}</p>
                      <p className="text-xs text-dark-500 capitalize mt-0.5">{ex.trackingType}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={() => setPhase('setup')}
              className="w-full py-4 bg-brand-500 text-white font-display font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              Continue <ChevronRight size={18} />
            </button>
          </motion.div>
        )}

        {/* ---- SETUP ---- */}
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4 pt-4 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-dark-50">{config?.label}</h2>
              <p className="text-dark-400 text-sm capitalize">{config?.category} • {config?.trackingType}</p>
            </div>

            {/* Phone placement guide */}
            <Card className="border-brand-500/30 bg-brand-500/5">
              <div className="flex gap-3">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-semibold text-dark-100 text-sm">Phone Placement</p>
                  <p className="text-dark-400 text-sm mt-1">{config?.phonePosition}</p>
                </div>
              </div>
            </Card>

            {/* Target reps */}
            {config?.trackingType === 'reps' && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Target Reps</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setTargetReps(Math.max(1, targetReps - 5))} className="w-12 h-12 rounded-xl bg-dark-700 text-dark-100 text-xl font-bold active:scale-95 transition-transform">−</button>
                  <span className="font-display text-4xl font-bold text-brand-400 flex-1 text-center">{targetReps}</span>
                  <button onClick={() => setTargetReps(targetReps + 5)} className="w-12 h-12 rounded-xl bg-dark-700 text-dark-100 text-xl font-bold active:scale-95 transition-transform">+</button>
                </div>
              </div>
            )}

            {/* Share with groups */}
            {myGroups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Share with Groups</label>
                <div className="space-y-2">
                  {myGroups.map((g: any) => (
                    <button
                      key={g._id}
                      onClick={() => setSelectedGroups(prev =>
                        prev.includes(g._id) ? prev.filter(id => id !== g._id) : [...prev, g._id]
                      )}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedGroups.includes(g._id) ? 'bg-brand-500/15 border-brand-500/40' : 'bg-dark-800 border-dark-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${selectedGroups.includes(g._id) ? 'bg-brand-500' : 'bg-dark-700'}`}>
                        👥
                      </div>
                      <span className="text-sm font-medium text-dark-100">{g.name}</span>
                      {selectedGroups.includes(g._id) && <CheckCircle size={16} className="text-brand-400 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleStart}
              className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform brand-glow"
            >
              <Play size={20} fill="white" />
              Start Session
            </button>
          </motion.div>
        )}

        {/* ---- ACTIVE WORKOUT ---- */}
        {phase === 'active' && session && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-h-screen bg-dark-950">
            {/* Active header */}
            <div className="px-4 pt-safe pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
                <span className="text-sm text-dark-300 font-medium">{isPaused ? 'Paused' : 'Active'}</span>
              </div>
              <span className="font-display font-bold text-dark-200 capitalize text-sm">
                {config?.icon} {config?.label}
              </span>
            </div>

            {/* Timer */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
              <ProgressRing
                value={config?.trackingType === 'reps' ? session.reps : seconds}
                max={config?.trackingType === 'reps' ? targetReps : 300}
                size={220}
                strokeWidth={10}
              >
                <div className="text-center">
                  <p className="font-display text-5xl font-bold text-dark-50">
                    {config?.trackingType === 'reps' ? session.reps : formattedTime}
                  </p>
                  <p className="text-dark-400 text-sm mt-1">
                    {config?.trackingType === 'reps' ? `/ ${targetReps} reps` : 'elapsed'}
                  </p>
                  {config?.trackingType === 'reps' && (
                    <p className="text-dark-500 text-xs mt-1">{formattedTime}</p>
                  )}
                </div>
              </ProgressRing>

              {/* Verification score live */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-dark-400 uppercase tracking-wide">Verification Score</span>
                  <VerificationBadge score={session.verificationScore.total} verified={session.verificationScore.total >= 60} />
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${session.verificationScore.total}%`,
                      background: session.verificationScore.total >= 60 ? '#22c55e' : session.verificationScore.total >= 40 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>

              {/* Manual rep count (for when sensors aren't ideal) */}
              {config?.trackingType === 'reps' && (
                <button
                  onPointerDown={incrementRep}
                  className="w-36 h-36 rounded-full bg-brand-500/20 border-2 border-brand-500/50 flex items-center justify-center active-pulse active:bg-brand-500/40 transition-all select-none"
                  style={{ WebkitUserSelect: 'none' }}
                >
                  <span className="font-display text-2xl font-bold text-brand-400">TAP</span>
                </button>
              )}
            </div>

            {/* Anti-cheat prompt */}
            <AnimatePresence>
              {antiCheatVisible && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mx-4 mb-4 p-4 bg-yellow-500/20 border border-yellow-500/40 rounded-2xl flex gap-3 items-start"
                >
                  <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-300 text-sm">Quick Check!</p>
                    <p className="text-yellow-200 text-sm">{currentPrompt}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="px-4 pb-safe pb-8 flex gap-3">
              <button
                onClick={handlePauseResume}
                className="flex-1 py-4 bg-dark-700 rounded-xl font-display font-bold text-dark-100 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {isPaused ? <><Play size={20} /> Resume</> : <><Pause size={20} /> Pause</>}
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 py-4 bg-brand-500 rounded-xl font-display font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Square size={20} fill="white" /> Finish
              </button>
            </div>
          </motion.div>
        )}

        {/* ---- COMPLETE ---- */}
        {phase === 'complete' && result && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="px-4 pt-8 space-y-5">
            <div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-7xl mb-4">
                {result.verified ? '🎉' : '💪'}
              </motion.div>
              <h2 className="font-display text-3xl font-bold text-dark-50">Workout Complete!</h2>
              <p className="text-dark-400 mt-1">{result.verified ? 'Verified workout! Great job.' : 'Good effort! Try to get a higher score.'}</p>
            </div>

            <Card className="space-y-3">
              {[
                { label: 'Exercise', value: config?.label, icon: config?.icon },
                { label: 'Duration', value: formatDuration(result.duration), icon: '⏱' },
                { label: 'Reps', value: result.reps || '—', icon: '🔄' },
                { label: 'Calories', value: `${result.caloriesBurned} kcal`, icon: '🔥' },
                { label: 'Verification', value: `${result.verificationScore}/100`, icon: result.verified ? '✅' : '⚠️' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-dark-400 text-sm">{item.label}</span>
                  </div>
                  <span className="font-display font-semibold text-dark-100">{item.value}</span>
                </div>
              ))}
            </Card>

            {/* WhatsApp share */}
            <ShareDailyReport />

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('select'); setSelectedGroups([]); }}
                className="flex-1 py-4 bg-dark-700 rounded-xl font-display font-bold text-dark-100 active:scale-95 transition-transform"
              >
                Another
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1 py-4 bg-brand-500 rounded-xl font-display font-bold text-white active:scale-95 transition-transform"
              >
                Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function ShareDailyReport() {
  const { request, loading } = useApi();
  const [url, setUrl] = useState('');

  const fetchReport = async () => {
    const res = await request<any>('/api/exercises/report');
    if (res?.success) {
      setUrl(res.data.whatsappUrl);
      window.open(res.data.whatsappUrl, '_blank');
    }
  };

  return (
    <button
      onClick={fetchReport}
      disabled={loading}
      className="w-full py-3.5 bg-green-600/20 border border-green-500/30 rounded-xl font-semibold text-green-400 flex items-center justify-center gap-2 active:scale-95 transition-transform"
    >
      {loading ? <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" /> : '📲'}
      Share to WhatsApp
    </button>
  );
}
