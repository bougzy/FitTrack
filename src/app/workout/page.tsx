'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { Play, Pause, Square, ChevronRight, CheckCircle, AlertTriangle, Heart, Footprints, Sparkles } from 'lucide-react';
import { ISensorSnapshot } from '@/types';
import { WhatsAppShare } from '@/components/ui/WhatsAppShare';
import { AICoachLive, AICoachSummary } from '@/components/ui/AICoach';
import { topInsight, postWorkoutSummary, CoachInsight } from '@/lib/utils/aiCoach';
import { PoseCamera } from '@/components/sensors/PoseCamera';

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
  const [aiInsight, setAiInsight] = useState<CoachInsight | null>(null);
  const [aiSummary, setAiSummary] = useState<ReturnType<typeof postWorkoutSummary> | null>(null);
  const [usePose, setUsePose] = useState(false);
  const [poseFormScore, setPoseFormScore] = useState<number | null>(null);
  const [poseIssues, setPoseIssues] = useState<string[]>([]);
  const antiCheatTimerRef = useRef<NodeJS.Timeout>();
  const verificationIntervalRef = useRef<NodeJS.Timeout>();
  const aiCoachIntervalRef = useRef<NodeJS.Timeout>();
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

  const { startTracking, stopTracking, heartRate, hrConnected, hrConnect, hrError, steps } = useSensors({
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

  // Live presence — ping every group the user is sharing this workout with
  useEffect(() => {
    if (!isActive || isPaused || selectedGroups.length === 0) return;
    const ping = () => {
      selectedGroups.forEach((gid) => {
        request<any>(`/api/groups/${gid}/live`, {
          method: 'POST',
          showError: false,
          body: {
            exerciseType: selectedExercise,
            reps: session?.reps || 0,
            durationSeconds: seconds,
            heartRate: heartRate ?? undefined,
          },
        });
      });
    };
    ping();
    const id = setInterval(ping, 30000);
    return () => clearInterval(id);
  }, [isActive, isPaused, selectedGroups, selectedExercise, session?.reps, seconds, heartRate, request]);

  // AI live coach — refresh top insight every 6 seconds
  useEffect(() => {
    if (!isActive || isPaused) {
      clearInterval(aiCoachIntervalRef.current);
      return;
    }
    const tick = () => {
      if (!session) return;
      const insight = topInsight({
        exerciseType: selectedExercise,
        reps: session.reps,
        targetReps,
        durationSeconds: seconds,
        heartRate: heartRate ?? undefined,
        steps,
        verification: session.verificationScore,
        recentSnapshots: snapshotsRef.current.slice(-60),
      });
      if (insight) setAiInsight(insight);
    };
    tick();
    aiCoachIntervalRef.current = setInterval(tick, 6000);
    return () => clearInterval(aiCoachIntervalRef.current);
  }, [isActive, isPaused, session, seconds, selectedExercise, targetReps, heartRate, steps]);

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
    clearInterval(aiCoachIntervalRef.current);
    stopSession();

    // Mark live presence as finished in any shared groups
    selectedGroups.forEach((gid) => {
      request<any>(`/api/groups/${gid}/live`, {
        method: 'POST',
        showError: false,
        body: { finished: true, exerciseType: selectedExercise },
      });
    });

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
      // Generate AI summary from final state
      const summary = postWorkoutSummary({
        exerciseType: selectedExercise,
        reps: session?.reps || 0,
        targetReps,
        durationSeconds: seconds,
        heartRate: heartRate ?? undefined,
        steps,
        verification: finalScore,
        recentSnapshots: snapshotsRef.current,
        calories: res.data?.caloriesBurned,
        verified: res.data?.verified,
      });
      setAiSummary(summary);
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

  // -------- Go Live --------
  const router = useRouter();
  const [creatingLive, setCreatingLive] = useState(false);

  const handleGoLive = async () => {
    setCreatingLive(true);
    const res = await request<any>('/api/live-sessions', {
      method: 'POST',
      body: {
        title: `${user?.name?.split(' ')[0] || 'My'} ${EXERCISE_CONFIGS[selectedExercise]?.label || 'Workout'}`,
        exerciseType: selectedExercise,
        isPublic: true,
        groupId: selectedGroups[0],
      },
    });
    setCreatingLive(false);
    if (res?.success) {
      router.push(`/live/${res.data.joinCode}`);
    }
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

            {/* AI camera form check toggle */}
            <button
              onClick={() => setUsePose(!usePose)}
              className={`w-full p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                usePose
                  ? 'border-purple-500/40 bg-gradient-to-br from-purple-500/15 to-indigo-500/5 shadow-ai-glow'
                  : 'border-white/10 glass-card'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                usePose ? 'bg-purple-500/30 border border-purple-500/40' : 'bg-white/5 border border-white/10'
              }`}>
                <Sparkles size={16} className={usePose ? 'text-purple-300' : 'text-dark-400'} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-display font-semibold text-dark-100 text-sm">AI Form Check</p>
                <p className="text-[11px] text-dark-400">Front camera scores form + auto rep counts</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${usePose ? 'bg-purple-500' : 'bg-dark-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${usePose ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>

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

            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleStart}
                className="flex-1 py-4 rounded-2xl font-display font-extrabold text-white shadow-brand-glow flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #c2410c 100%)' }}
              >
                <Play size={20} fill="white" />
                Start
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleGoLive}
                disabled={creatingLive}
                title="Host a live session and invite friends"
                className="px-5 py-4 rounded-2xl font-display font-extrabold text-white relative overflow-hidden flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 60%, #991b1b 100%)' }}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
                {creatingLive ? 'Setting up…' : 'Go Live'}
              </motion.button>
            </div>
            <p className="text-[11px] text-dark-500 text-center -mt-2">
              Solo workout · or <strong className="text-red-300">Go Live</strong> to host your selected groups
            </p>
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

              {/* Live sensor metrics */}
              <div className="w-full grid grid-cols-3 gap-2">
                <motion.button
                  whileTap={!hrConnected ? { scale: 0.95 } : undefined}
                  onClick={!hrConnected ? hrConnect : undefined}
                  disabled={hrConnected}
                  className="glass-card rounded-2xl p-2.5 text-center disabled:active:scale-100 relative overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-dark-400 font-semibold">
                    <Heart size={12} className={`text-red-400 ${heartRate ? 'heartbeat' : ''}`} /> HR
                  </div>
                  <p className="font-display font-bold text-dark-50 text-lg leading-tight mt-0.5">
                    {heartRate ?? '—'}
                  </p>
                  <p className="text-[10px] text-dark-500">{hrConnected ? 'bpm' : 'Tap to pair'}</p>
                </motion.button>
                <div className="glass-card rounded-2xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-dark-400 font-semibold">
                    <Footprints size={12} className="text-blue-400" /> Steps
                  </div>
                  <p className="font-display font-bold text-dark-50 text-lg leading-tight mt-0.5">{steps}</p>
                  <p className="text-[10px] text-dark-500">detected</p>
                </div>
                <div className="glass-card rounded-2xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-dark-400 font-semibold">
                    🔥 Cal
                  </div>
                  <p className="font-display font-bold text-dark-50 text-lg leading-tight mt-0.5">
                    {Math.round((config?.caloriesPerRep || 0) * (session.reps || 0) +
                      (config?.caloriesPerMinute || 0) * (seconds / 60))}
                  </p>
                  <p className="text-[10px] text-dark-500">kcal</p>
                </div>
              </div>
              {hrError && <p className="text-[11px] text-red-400 text-center -mt-2">{hrError}</p>}

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

            {/* Pose camera (optional) */}
            {usePose && (
              <div className="px-4 mb-3">
                <PoseCamera
                  exerciseType={selectedExercise}
                  active={isActive && !isPaused}
                  onRep={handleRepDetected}
                  onForm={(score, issues) => {
                    setPoseFormScore(score);
                    setPoseIssues(issues);
                  }}
                />
                {poseFormScore !== null && (
                  <div className="mt-2 flex items-center justify-between glass-card rounded-xl p-2 text-xs">
                    <span className="text-purple-300 font-semibold uppercase tracking-wider">AI Form</span>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-dark-50">{poseFormScore}</span>
                      {poseIssues.length > 0 && (
                        <span className="text-yellow-300 text-[10px]">{poseIssues[0]}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI live coach */}
            <div className="px-4 mb-2">
              <AICoachLive insight={aiInsight} />
            </div>

            {/* Anti-cheat prompt */}
            <AnimatePresence>
              {antiCheatVisible && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mx-4 mb-4 p-4 bg-yellow-500/20 border border-yellow-500/40 rounded-2xl flex gap-3 items-start backdrop-blur-md"
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
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handlePauseResume}
                className="flex-1 py-4 glass-strong rounded-2xl font-display font-bold text-dark-100 flex items-center justify-center gap-2 transition-transform"
              >
                {isPaused ? <><Play size={20} /> Resume</> : <><Pause size={20} /> Pause</>}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleFinish}
                className="flex-1 py-4 rounded-2xl font-display font-bold text-white flex items-center justify-center gap-2 transition-transform shadow-brand-glow"
                style={{ background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #c2410c 100%)' }}
              >
                <Square size={20} fill="white" /> Finish
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ---- COMPLETE ---- */}
        {phase === 'complete' && result && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="px-4 pt-8 space-y-5">
            <div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-7xl mb-4 float">
                {result.verified ? '🎉' : '💪'}
              </motion.div>
              <h2 className="font-display text-3xl font-extrabold gradient-text">Workout Complete!</h2>
              <p className="text-dark-400 mt-1">{result.verified ? 'Verified workout! Great job.' : 'Good effort! Try to get a higher score.'}</p>
            </div>

            {/* AI summary */}
            {aiSummary && (
              <AICoachSummary
                grade={aiSummary.grade}
                narrative={aiSummary.narrative}
                tips={aiSummary.tips}
                insights={aiSummary.insights}
              />
            )}

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
  const [text, setText] = useState('');

  const fetchReport = async () => {
    if (text) return text; // already loaded
    const res = await request<any>('/api/exercises/report');
    if (res?.success) {
      setText(res.data.whatsappText);
      return res.data.whatsappText as string;
    }
    return '';
  };

  // Pre-fetch on mount so the picker has text ready
  useEffect(() => { fetchReport(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <WhatsAppShare
      title="Share Daily Report"
      text={text}
      trigger={
        <button
          type="button"
          disabled={loading || !text}
          className="w-full py-3.5 bg-green-600/20 border border-green-500/30 rounded-xl font-semibold text-green-400 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading && !text ? (
            <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
          ) : (
            '📲'
          )}
          Share to WhatsApp
        </button>
      }
    />
  );
}
