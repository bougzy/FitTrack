'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useApi } from '@/hooks/useApi';
import { useSensors } from '@/hooks/useSensors';
import {
  Radio,
  Users,
  Crown,
  Heart,
  Square,
  Play,
  Trophy,
  Medal,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { EXERCISE_CONFIGS, formatDuration } from '@/lib/utils/exercises';
import { ISensorSnapshot } from '@/types';
import { WhatsAppShare } from '@/components/ui/WhatsAppShare';

type Phase = 'preview' | 'lobby' | 'running' | 'ended';

export default function LiveSessionPage() {
  const router = useRouter();
  const params = useParams() as { code: string };
  const code = (params.code || '').toUpperCase();
  const { isAuthenticated, isLoading, user, token } = useAuthStore();
  const { request } = useApi();

  const [preview, setPreview] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>('preview');
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  const isHost = state?.hostId === user?._id;
  const cfg = state?.exerciseType ? EXERCISE_CONFIGS[state.exerciseType] : null;

  const tickRef = useRef<NodeJS.Timeout>();
  const pollRef = useRef<NodeJS.Timeout>();
  const pingRef = useRef<NodeJS.Timeout>();
  const snapshotsRef = useRef<ISensorSnapshot[]>([]);

  const handleSnapshot = useCallback((s: ISensorSnapshot) => {
    snapshotsRef.current.push(s);
  }, []);
  const handleRep = useCallback(() => {
    setReps((r) => r + 1);
    if (navigator.vibrate) navigator.vibrate(20);
  }, []);

  const { startTracking, stopTracking, heartRate, hrConnect, hrConnected } = useSensors({
    onSnapshot: handleSnapshot,
    onRepDetected: handleRep,
    exerciseType: state?.exerciseType || 'pushups',
  });

  // Public preview load (works pre-auth)
  useEffect(() => {
    if (!code) return;
    fetch(`/api/live-sessions/${code}/preview`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPreview(d.data);
        else setError(d.error || 'Session not found');
      })
      .catch(() => setError('Could not load session'));
  }, [code]);

  // Auth redirect — go to login but remember the code
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      sessionStorage.setItem('pendingLiveCode', code);
      router.replace(`/login?redirect=${encodeURIComponent(`/live/${code}`)}`);
    }
  }, [isLoading, isAuthenticated, code, router]);

  // Polling state every 4s once we have a session
  useEffect(() => {
    if (phase === 'preview' || phase === 'ended' || !isAuthenticated) return;
    const fetchState = async () => {
      const res = await request<any>(`/api/live-sessions/${code}/state`, { showError: false });
      if (res?.success) {
        setState(res.data);
        if (res.data.status === 'ended' && (phase as Phase) !== 'ended') {
          setPhase('ended');
          stopTracking();
        } else if (res.data.status === 'active' && phase === 'lobby' && !isHost) {
          // Host started — auto-advance participants
          setPhase('running');
          await startTracking();
        }
      }
    };
    fetchState();
    pollRef.current = setInterval(fetchState, 4000);
    return () => clearInterval(pollRef.current);
  }, [phase, code, isAuthenticated, request, isHost, startTracking, stopTracking]);

  // Local timer when running
  useEffect(() => {
    if (phase !== 'running') {
      clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, [phase]);

  // Ping our state to the server every 5s
  useEffect(() => {
    if (phase !== 'running') {
      clearInterval(pingRef.current);
      return;
    }
    const ping = () => {
      request<any>(`/api/live-sessions/${code}/state`, {
        method: 'POST',
        showError: false,
        body: {
          reps,
          durationSeconds: seconds,
          heartRate: heartRate ?? undefined,
          status: 'active',
        },
      });
    };
    ping();
    pingRef.current = setInterval(ping, 5000);
    return () => clearInterval(pingRef.current);
  }, [phase, reps, seconds, heartRate, code, request]);

  const handleJoin = async () => {
    const res = await request<any>(`/api/live-sessions/${code}/join`, { method: 'POST' });
    if (res?.success) {
      setPhase(res.data.status === 'active' ? 'running' : 'lobby');
      if (res.data.status === 'active') await startTracking();
      else toast.success(`Welcome to ${res.data.title}`);
    } else {
      setError(res?.error || 'Could not join');
    }
  };

  const handleHostStart = async () => {
    setReps(0);
    setSeconds(0);
    snapshotsRef.current = [];
    await startTracking();
    setPhase('running');
    await request<any>(`/api/live-sessions/${code}/state`, {
      method: 'POST',
      body: { action: 'start' },
    });
    toast.success("You're live!");
  };

  const handleHostEnd = async () => {
    if (!confirm('End this live session for everyone?')) return;
    stopTracking();
    const res = await request<any>(`/api/live-sessions/${code}/end`, { method: 'POST' });
    if (res?.success) {
      setPhase('ended');
      toast.success('Session ended');
    }
  };

  const handleLeave = async () => {
    stopTracking();
    await request<any>(`/api/live-sessions/${code}/join`, {
      method: 'DELETE',
      showError: false,
    });
    router.push('/dashboard');
  };

  // Update host stats when reps/seconds change in host-running mode
  useEffect(() => {
    if (!isHost || phase !== 'running') return;
    request<any>(`/api/live-sessions/${code}/state`, {
      method: 'POST',
      showError: false,
      body: {
        reps,
        durationSeconds: seconds,
        heartRate: heartRate ?? undefined,
      },
    });
  }, [isHost, phase, reps, seconds, heartRate, code, request]);

  if (isLoading) return <FullScreenLoader text="Loading session…" />;
  if (error)
    return (
      <FullScreenError
        message={error}
        onBack={() => router.replace('/dashboard')}
      />
    );

  if (!preview) return <FullScreenLoader text="Loading session…" />;

  // ---------------- Render branches ----------------

  if (phase === 'ended' || state?.status === 'ended') {
    return <EndedView state={state} preview={preview} />;
  }

  if (phase === 'preview' || phase === 'lobby') {
    return (
      <LobbyView
        preview={preview}
        state={state}
        code={code}
        isHost={isHost}
        joined={phase === 'lobby'}
        onJoin={handleJoin}
        onHostStart={handleHostStart}
        onLeave={handleLeave}
        token={token}
      />
    );
  }

  // ---- RUNNING ----
  return (
    <div className="relative min-h-screen bg-dark-950 aurora-bg flex flex-col">
      <div className="absolute inset-0 bg-mesh-brand opacity-30 pointer-events-none" />

      {/* Live header */}
      <div className="relative z-10 px-4 pt-safe pt-4 pb-3 glass-strong border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <p className="text-xs font-display font-extrabold uppercase tracking-widest text-red-300">
              Live
            </p>
            <p className="text-xs text-dark-400">· {state?.title}</p>
          </div>
          <button onClick={handleLeave} className="text-dark-300 text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">
            Leave
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-2xl w-full mx-auto px-4 pt-4 pb-32 space-y-4">
        {/* Hero stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-card rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-dark-400 font-semibold">Your reps</p>
            <p className="font-display text-3xl font-extrabold text-dark-50 leading-tight live-tick">{reps}</p>
            <p className="text-[10px] text-dark-500">{formatDuration(seconds)}</p>
          </div>
          <div className="glass-card rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-dark-400 font-semibold flex items-center justify-center gap-1">
              <Crown size={10} className="text-yellow-400" /> Host
            </p>
            <p className="font-display text-3xl font-extrabold text-yellow-300 leading-tight">
              {state?.host?.reps ?? 0}
            </p>
            <p className="text-[10px] text-dark-500">{state?.hostName}</p>
          </div>
          <button
            onClick={!hrConnected ? hrConnect : undefined}
            disabled={hrConnected}
            className="glass-card rounded-2xl p-3 text-center disabled:active:scale-100"
          >
            <p className="text-[10px] uppercase tracking-widest text-dark-400 font-semibold flex items-center justify-center gap-1">
              <Heart size={10} className={`text-red-400 ${heartRate ? 'heartbeat' : ''}`} /> HR
            </p>
            <p className="font-display text-3xl font-extrabold text-dark-50 leading-tight">
              {heartRate ?? '—'}
            </p>
            <p className="text-[10px] text-dark-500">{hrConnected ? 'bpm' : 'Tap to pair'}</p>
          </button>
        </div>

        {/* Live leaderboard */}
        <div className="glass-card rounded-2xl p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-dark-400 mb-2 flex items-center gap-1">
            <Users size={10} /> Live · {state?.participantCount ?? 0}
          </p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            <ParticipantRow
              rank={0}
              name={state?.hostName + ' (Host)'}
              reps={state?.host?.reps ?? 0}
              hr={state?.host?.heartRate}
              isMe={isHost}
              isHost
            />
            {state?.participants?.map((p: any, i: number) => (
              <ParticipantRow
                key={p.userId}
                rank={i + 1}
                name={p.name}
                reps={p.reps}
                hr={p.heartRate}
                isMe={p.userId === user?._id}
              />
            ))}
          </div>
        </div>

        {/* Tap to count */}
        {cfg?.trackingType === 'reps' && (
          <div className="flex justify-center pt-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onPointerDown={handleRep}
              className="w-44 h-44 rounded-full glass-brand border-2 border-brand-500/50 flex items-center justify-center active-pulse select-none"
            >
              <span className="font-display text-3xl font-extrabold text-brand-300">TAP</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-safe pb-4 pt-2 glass-strong border-t border-white/5 z-20">
        <div className="max-w-2xl mx-auto flex gap-2">
          {isHost ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleHostEnd}
              className="flex-1 py-3 rounded-2xl font-display font-bold text-white shadow-brand-glow flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)' }}
            >
              <Square size={16} fill="white" /> End for everyone
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLeave}
              className="flex-1 py-3 rounded-2xl font-display font-bold text-dark-100 glass-strong"
            >
              Leave session
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============== Sub-components ==============

function LobbyView({
  preview,
  state,
  code,
  isHost,
  joined,
  onJoin,
  onHostStart,
  onLeave,
  token,
}: {
  preview: any;
  state: any;
  code: string;
  isHost: boolean;
  joined: boolean;
  onJoin: () => void;
  onHostStart: () => void;
  onLeave: () => void;
  token: string | null;
}) {
  const cfg = EXERCISE_CONFIGS[preview.exerciseType] || null;
  const fullUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/live/${code}` : '';
  const shareText = `🔴 *Live Workout: ${preview.title}*\n\nHost: ${preview.host.name}\nExercise: ${cfg?.label || preview.exerciseType}\n\nTap to join: ${fullUrl}\n\n— FitTrack`;

  return (
    <div className="relative min-h-screen bg-dark-950 aurora-bg flex flex-col">
      <div className="absolute inset-0 bg-mesh-brand opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.15] pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full mx-auto px-4 pt-safe pt-6 pb-32 space-y-5">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-card text-[10px] font-semibold uppercase tracking-widest text-red-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            Live Workout · {preview.status}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold gradient-text leading-tight">
            {preview.title}
          </h1>
          <p className="text-dark-300 text-sm">
            Hosted by <strong className="text-dark-100">{preview.host.name}</strong>
          </p>
        </motion.div>

        {/* Exercise card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="glass-strong rounded-3xl p-5 sheen relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl glass-brand flex items-center justify-center text-3xl float">
              {cfg?.icon || '💪'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-dark-400 font-semibold">Exercise</p>
              <p className="font-display text-xl font-bold text-dark-50">
                {cfg?.label || preview.exerciseType}
              </p>
              <p className="text-xs text-dark-400 capitalize">{cfg?.category}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2"
        >
          <StatTile label="Joined" value={state?.participantCount ?? preview.participantCount} icon={<Users size={14} />} />
          <StatTile label="Capacity" value={preview.capacity} icon={<Sparkles size={14} />} />
          <StatTile
            label="Status"
            value={preview.status === 'waiting' ? 'Lobby' : preview.status === 'active' ? 'Live' : 'Ended'}
            icon={<Radio size={14} className={preview.status === 'active' ? 'text-red-400' : ''} />}
          />
        </motion.div>

        {/* Joined participants */}
        {state?.participants?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card rounded-2xl p-4"
          >
            <p className="text-[10px] uppercase tracking-widest text-dark-400 font-semibold mb-3">
              In the room
            </p>
            <div className="flex flex-wrap gap-2">
              {state.participants.slice(0, 12).map((p: any) => (
                <div key={p.userId} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center font-display font-bold text-[10px] text-white">
                    {p.name?.[0]?.toUpperCase() || 'M'}
                  </span>
                  <span className="text-dark-100 font-medium">{p.name}</span>
                </div>
              ))}
              {state.participants.length > 12 && (
                <span className="text-xs text-dark-400 self-center">
                  +{state.participants.length - 12} more
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Share row — host only or anyone with link */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <p className="text-[10px] uppercase tracking-widest text-dark-400 font-semibold flex items-center gap-1">
            <Share2 size={10} /> Invite friends
          </p>
          <div className="flex items-center gap-2 glass-card rounded-2xl px-3 py-2.5">
            <p className="font-mono text-sm text-dark-100 truncate flex-1">
              {fullUrl}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(fullUrl);
                toast.success('Link copied');
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-300 font-semibold"
            >
              Copy
            </button>
          </div>
          <WhatsAppShare
            title="Share Live Session"
            text={shareText}
            trigger={
              <button className="w-full py-3 rounded-2xl font-display font-bold text-green-300 bg-green-500/15 border border-green-500/30 flex items-center justify-center gap-2">
                📲 Share via WhatsApp
              </button>
            }
          />
        </motion.div>
      </div>

      {/* Action footer */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-safe pb-4 pt-2 glass-strong border-t border-white/5 z-20">
        <div className="max-w-2xl mx-auto flex gap-2">
          {isHost ? (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onLeave}
                className="px-5 py-3 rounded-2xl font-display font-bold text-dark-100 glass-strong"
              >
                <X size={16} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onHostStart}
                className="flex-1 py-3 rounded-2xl font-display font-extrabold text-white shadow-brand-glow flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #c2410c 100%)' }}
              >
                <Play size={16} fill="white" /> Start Live
              </motion.button>
            </>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onJoin}
              disabled={joined}
              className="flex-1 py-3 rounded-2xl font-display font-extrabold text-white shadow-brand-glow flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #c2410c 100%)' }}
            >
              <Sparkles size={16} />
              {joined ? "You're in — waiting for host" : 'Join Session'}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

function EndedView({ state, preview }: { state: any; preview: any }) {
  const router = useRouter();
  const cfg = EXERCISE_CONFIGS[state?.exerciseType || preview.exerciseType] || null;
  const sorted = (state?.participants || []).sort((a: any, b: any) => b.reps - a.reps);
  const meId = useAuthStore.getState().user?._id;
  const myRank = sorted.findIndex((p: any) => p.userId === meId);

  return (
    <div className="relative min-h-screen bg-dark-950 aurora-bg pb-24">
      <div className="absolute inset-0 bg-mesh-brand opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full mx-auto px-4 pt-safe pt-8 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="text-6xl float">
            🏁
          </motion.div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Session ended</h1>
          <p className="text-dark-300 text-sm">{state?.title || preview.title}</p>
        </motion.div>

        {myRank >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-brand rounded-3xl p-5 text-center sheen relative overflow-hidden"
          >
            <p className="text-[10px] uppercase tracking-widest text-brand-200 font-semibold">Your finish</p>
            <p className="font-display text-5xl font-extrabold text-dark-50 mt-1">#{myRank + 1}</p>
            <p className="text-sm text-dark-200 mt-1">
              {sorted[myRank].reps} reps · {formatDuration(sorted[myRank].durationSeconds)}
            </p>
          </motion.div>
        )}

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-dark-400 font-semibold flex items-center gap-1">
            <Trophy size={10} /> Final Leaderboard
          </p>
          {/* Host */}
          <div className="glass-card rounded-2xl p-3 flex items-center gap-3 border-yellow-500/25 border">
            <span className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
              <Crown size={14} className="text-yellow-400" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-display font-bold text-dark-50">{state?.hostName || preview.host.name}</p>
              <p className="text-xs text-dark-400">Host · {cfg?.label}</p>
            </div>
            <p className="font-display text-xl font-extrabold text-yellow-300">{state?.host?.reps ?? 0}</p>
          </div>
          {sorted.map((p: any, i: number) => (
            <div
              key={p.userId}
              className={`glass-card rounded-2xl p-3 flex items-center gap-3 ${
                i < 3 ? 'border-brand-500/25 border' : ''
              }`}
            >
              <span className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-display font-bold text-dark-200">
                {i === 0 ? <Trophy size={14} className="text-yellow-400" /> : i === 1 ? <Medal size={14} className="text-gray-300" /> : i === 2 ? <Medal size={14} className="text-orange-400" /> : `#${i + 1}`}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-dark-100">{p.name}</p>
                <p className="text-xs text-dark-400">
                  {p.reps} reps · {formatDuration(p.durationSeconds)}
                </p>
              </div>
              <p className="font-display text-base font-bold text-brand-300">{p.finalScore}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-3 rounded-2xl font-display font-bold text-white shadow-brand-glow"
          style={{ background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #c2410c 100%)' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: any;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-dark-400 font-semibold flex items-center justify-center gap-1">
        {icon}
        {label}
      </p>
      <p className="font-display text-xl font-bold text-dark-50 mt-1">{value}</p>
    </div>
  );
}

function ParticipantRow({
  rank,
  name,
  reps,
  hr,
  isMe,
  isHost,
}: {
  rank: number;
  name: string;
  reps: number;
  hr?: number;
  isMe?: boolean;
  isHost?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl ${
        isHost
          ? 'bg-yellow-500/10 border border-yellow-500/20'
          : isMe
            ? 'bg-brand-500/10 border border-brand-500/30'
            : 'bg-white/3 border border-white/5'
      }`}
    >
      <span className="w-5 text-center text-[10px] font-display font-bold text-dark-400">
        {isHost ? <Crown size={11} className="text-yellow-400 mx-auto" /> : `#${rank}`}
      </span>
      <span className="flex-1 text-xs font-semibold text-dark-100 truncate">
        {name} {isMe && <span className="text-brand-300">(you)</span>}
      </span>
      {hr && <span className="text-[10px] text-red-300">❤️ {hr}</span>}
      <span className="font-display font-bold text-sm text-dark-50 w-8 text-right">{reps}</span>
    </div>
  );
}

function FullScreenLoader({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-dark-950 aurora-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl glass-brand flex items-center justify-center text-2xl float">
          🔴
        </div>
        <p className="text-dark-300 text-sm">{text}</p>
      </div>
    </div>
  );
}

function FullScreenError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-6xl">⚠️</div>
        <h2 className="font-display text-xl font-bold text-dark-50">{message}</h2>
        <button
          onClick={onBack}
          className="w-full py-3 rounded-2xl bg-brand-500 text-white font-display font-bold"
        >
          Back
        </button>
      </div>
    </div>
  );
}
