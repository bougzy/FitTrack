'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '@/hooks/useApi';
import { useSensors } from '@/hooks/useSensors';
import { AppShell } from '@/components/ui/AppShell';
import { Card, ProgressRing, Skeleton } from '@/components/ui/index';
import { Play, Pause, SkipForward, Square, Heart, Footprints, Activity } from 'lucide-react';
import { EXERCISE_CONFIGS, formatDuration } from '@/lib/utils/exercises';
import { computeVerificationScore } from '@/lib/utils/verification';
import { ISensorSnapshot } from '@/types';

type Phase = 'overview' | 'exercise' | 'rest' | 'complete';

export default function ProgramRunnerPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { request } = useApi();

  const [program, setProgram] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>('overview');
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [reps, setReps] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);

  const snapshotsRef = useRef<ISensorSnapshot[]>([]);
  const tickRef = useRef<NodeJS.Timeout>();

  const handleSnapshot = useCallback((s: ISensorSnapshot) => {
    snapshotsRef.current.push(s);
  }, []);

  const handleRep = useCallback(() => {
    setReps(r => r + 1);
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);

  const currentExercise = program?.exercises?.[exerciseIdx];
  const currentConfig = currentExercise ? EXERCISE_CONFIGS[currentExercise.exerciseType] : null;
  const isDuration = currentConfig?.trackingType === 'duration';

  const { startTracking, stopTracking, heartRate, steps, hrConnect, hrConnected, hrError } = useSensors({
    onSnapshot: handleSnapshot,
    onRepDetected: handleRep,
    exerciseType: currentExercise?.exerciseType || 'pushups',
  });

  useEffect(() => {
    if (id) {
      request<any>(`/api/programs/${id}`).then(res => {
        if (res?.success) setProgram(res.data);
      });
    }
  }, [id]);

  // Tick during exercise / rest
  useEffect(() => {
    if (paused) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    if (phase === 'exercise') {
      tickRef.current = setInterval(() => setSecondsElapsed(s => s + 1), 1000);
    } else if (phase === 'rest') {
      tickRef.current = setInterval(() => {
        setRestRemaining(r => {
          if (r <= 1) {
            clearInterval(tickRef.current);
            handleRestDone();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, paused]);

  const startProgram = async () => {
    snapshotsRef.current = [];
    setReps(0);
    setSecondsElapsed(0);
    setExerciseIdx(0);
    setSetIdx(0);
    setPhase('exercise');
    await startTracking();
  };

  const finishCurrentSet = async () => {
    stopTracking();
    if (tickRef.current) clearInterval(tickRef.current);

    const ex = currentExercise;
    if (!ex) return;

    // Save session
    const score = computeVerificationScore(
      snapshotsRef.current,
      secondsElapsed,
      reps,
      ex.exerciseType
    );
    const res = await request<any>('/api/sessions', {
      method: 'POST',
      body: {
        exerciseType: ex.exerciseType,
        duration: secondsElapsed,
        reps,
        sets: 1,
        sharedGroups: [],
        sensorData: snapshotsRef.current.slice(-100),
        notes: `Program: ${program?.name} (set ${setIdx + 1}/${ex.sets})`,
      },
    });
    if (res?.success) {
      setSavedSessionIds(prev => [...prev, res.data._id]);
    }

    // Reset for next set
    setReps(0);
    setSecondsElapsed(0);
    snapshotsRef.current = [];

    const isLastSet = setIdx + 1 >= ex.sets;
    const isLastExercise = exerciseIdx + 1 >= program.exercises.length;

    if (isLastSet && isLastExercise) {
      setPhase('complete');
      await request(`/api/programs/${id}`, {
        method: 'POST',
        body: { action: 'complete' },
        showError: false,
      });
      return;
    }

    // Rest phase
    setRestRemaining(ex.restSeconds || 30);
    setPhase('rest');
  };

  const handleRestDone = async () => {
    const ex = currentExercise;
    if (!ex) return;
    const isLastSet = setIdx + 1 >= ex.sets;
    if (isLastSet) {
      setExerciseIdx(i => i + 1);
      setSetIdx(0);
    } else {
      setSetIdx(i => i + 1);
    }
    setPhase('exercise');
    await startTracking();
  };

  const skipRest = () => {
    setRestRemaining(0);
    handleRestDone();
  };

  if (!program) {
    return (
      <AppShell title="Program" showBack>
        <div className="p-4 space-y-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (phase === 'overview') {
    return (
      <AppShell title={program.name} showBack>
        <div className="px-4 pt-4 space-y-4 pb-6">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-brand-500/15 rounded-xl flex items-center justify-center text-2xl">📋</div>
              <div>
                <p className="font-display font-bold text-dark-50 text-lg">{program.name}</p>
                <p className="text-xs text-dark-400 capitalize">{program.difficulty} • ~{program.estimatedMinutes}m</p>
              </div>
            </div>
            {program.description && <p className="text-sm text-dark-300">{program.description}</p>}
          </Card>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-dark-500 font-semibold">Exercises</p>
            {program.exercises.map((e: any, i: number) => {
              const cfg = EXERCISE_CONFIGS[e.exerciseType];
              return (
                <Card key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {cfg?.icon || '🏋️'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-dark-100">{cfg?.label || e.exerciseType}</p>
                    <p className="text-xs text-dark-500">
                      {e.sets} × {e.targetReps ? `${e.targetReps} reps` : `${e.durationSeconds}s`}
                      {' • '}{e.restSeconds}s rest
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          <button
            onClick={startProgram}
            className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 brand-glow"
          >
            <Play size={20} fill="white" /> Start Program
          </button>
        </div>
      </AppShell>
    );
  }

  if (phase === 'rest') {
    const next = program.exercises[exerciseIdx];
    const nextSetNum = setIdx + 2 > next.sets ? 1 : setIdx + 2;
    const goingToNextExercise = setIdx + 1 >= next.sets;
    const upcoming = goingToNextExercise ? program.exercises[exerciseIdx + 1] : next;
    const upcomingCfg = upcoming ? EXERCISE_CONFIGS[upcoming.exerciseType] : null;

    return (
      <AppShell title="Rest" showBack={false}>
        <div className="px-4 pt-8 flex flex-col items-center text-center space-y-6">
          <p className="text-dark-400 uppercase tracking-widest text-xs font-semibold">Recovery</p>
          <ProgressRing
            value={(currentExercise?.restSeconds || 30) - restRemaining}
            max={currentExercise?.restSeconds || 30}
            size={220}
            strokeWidth={10}
          >
            <div className="text-center">
              <p className="font-display text-6xl font-bold text-dark-50">{restRemaining}</p>
              <p className="text-dark-400 text-sm">seconds</p>
            </div>
          </ProgressRing>

          {upcoming && (
            <Card className="w-full">
              <p className="text-xs text-dark-500 mb-2">UP NEXT</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{upcomingCfg?.icon}</span>
                <div className="flex-1 text-left">
                  <p className="font-display font-bold text-dark-100">{upcomingCfg?.label}</p>
                  <p className="text-xs text-dark-400">
                    Set {goingToNextExercise ? 1 : nextSetNum} of {(goingToNextExercise ? upcoming.sets : next.sets)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <button
            onClick={skipRest}
            className="w-full py-3.5 bg-dark-700 text-dark-100 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <SkipForward size={18} /> Skip Rest
          </button>
        </div>
      </AppShell>
    );
  }

  if (phase === 'complete') {
    return (
      <AppShell title="Complete" showBack={false}>
        <div className="px-4 pt-12 text-center space-y-5">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-7xl">
            🏆
          </motion.div>
          <h2 className="font-display text-3xl font-bold text-dark-50">Program Complete!</h2>
          <p className="text-dark-400">You finished {program.name}. Excellent work.</p>
          <Card>
            <p className="text-sm text-dark-300">{savedSessionIds.length} sessions logged</p>
          </Card>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/programs')}
              className="flex-1 py-4 bg-dark-700 rounded-xl font-display font-bold text-dark-100"
            >
              Programs
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-4 bg-brand-500 rounded-xl font-display font-bold text-white"
            >
              Dashboard
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Exercise phase
  const target = isDuration ? currentExercise.durationSeconds : currentExercise.targetReps;
  const currentValue = isDuration ? secondsElapsed : reps;
  const exerciseDone = currentValue >= (target || 0);

  return (
    <AppShell showBack={false}>
      <div className="flex flex-col min-h-screen bg-dark-950">
        <div className="px-4 pt-safe pt-4 pb-2 flex items-center justify-between">
          <p className="text-xs text-dark-400">
            Exercise {exerciseIdx + 1}/{program.exercises.length} · Set {setIdx + 1}/{currentExercise.sets}
          </p>
          <p className="font-display font-bold text-dark-200 text-sm capitalize">
            {currentConfig?.icon} {currentConfig?.label}
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <ProgressRing value={currentValue} max={target || 1} size={220} strokeWidth={10}>
            <div className="text-center">
              <p className="font-display text-5xl font-bold text-dark-50">
                {isDuration ? formatDuration(secondsElapsed) : reps}
              </p>
              <p className="text-dark-400 text-sm mt-1">
                {isDuration ? `target ${currentExercise.durationSeconds}s` : `/ ${currentExercise.targetReps} reps`}
              </p>
            </div>
          </ProgressRing>

          {/* Live sensor metrics */}
          <div className="w-full grid grid-cols-3 gap-2">
            <SensorTile
              icon={<Heart size={16} className="text-red-400" />}
              label="HR"
              value={heartRate ? `${heartRate}` : '—'}
              unit="bpm"
              onClick={!hrConnected ? hrConnect : undefined}
              hint={!hrConnected ? 'Tap to pair' : undefined}
            />
            <SensorTile
              icon={<Footprints size={16} className="text-blue-400" />}
              label="Steps"
              value={`${steps}`}
            />
            <SensorTile
              icon={<Activity size={16} className="text-brand-400" />}
              label="Time"
              value={formatDuration(secondsElapsed)}
            />
          </div>

          {hrError && <p className="text-xs text-red-400 text-center">{hrError}</p>}

          {!isDuration && (
            <button
              onPointerDown={handleRep}
              className="w-32 h-32 rounded-full bg-brand-500/20 border-2 border-brand-500/50 flex items-center justify-center active:bg-brand-500/40 select-none"
            >
              <span className="font-display text-xl font-bold text-brand-400">TAP</span>
            </button>
          )}
        </div>

        <div className="px-4 pb-safe pb-8 flex gap-3">
          <button
            onClick={() => setPaused(p => !p)}
            className="flex-1 py-4 bg-dark-700 rounded-xl font-display font-bold text-dark-100 flex items-center justify-center gap-2 active:scale-95"
          >
            {paused ? <><Play size={18} /> Resume</> : <><Pause size={18} /> Pause</>}
          </button>
          <button
            onClick={finishCurrentSet}
            className="flex-1 py-4 bg-brand-500 rounded-xl font-display font-bold text-white flex items-center justify-center gap-2 active:scale-95"
          >
            <Square size={18} fill="white" /> {exerciseDone ? 'Done' : 'Finish Set'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function SensorTile({
  icon,
  label,
  value,
  unit,
  onClick,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  onClick?: () => void;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="bg-dark-800 border border-dark-700 rounded-xl p-2.5 text-center active:scale-95 transition-transform disabled:active:scale-100"
    >
      <div className="flex items-center justify-center gap-1 text-xs text-dark-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="font-display font-bold text-dark-50 text-lg leading-tight mt-0.5">{value}</p>
      {unit && <p className="text-[10px] text-dark-500">{unit}</p>}
      {hint && <p className="text-[10px] text-brand-400 mt-0.5">{hint}</p>}
    </button>
  );
}
