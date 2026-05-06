'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * On-device pose detection via MediaPipe Tasks Vision.
 * Counts reps from joint angles for a given exercise type and emits a
 * form-quality score [0..100] plus a list of detected form issues.
 *
 * Runs entirely in the browser — no network calls beyond the MediaPipe
 * model fetch (cached after first load via the PWA service worker).
 */

interface PoseCameraProps {
  exerciseType: string;
  onRep: () => void;
  onForm: (score: number, issues: string[]) => void;
  active: boolean;
}

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

function angleAt(a: any, b: any, c: any): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  if (magAB === 0 || magCB === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB)))) * 180) / Math.PI;
}

export function PoseCamera({ exerciseType, onRep, onForm, active }: PoseCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const stateRef = useRef<{ phase: 'up' | 'down'; lastRep: number }>({ phase: 'up', lastRep: 0 });
  const formScoresRef = useRef<number[]>([]);

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    if (!active || !tracking) return;

    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        if (cancelled) return;
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus('ready');
        loop();
      } catch (e: any) {
        console.error('Pose init failed:', e);
        setError(e?.message || 'Failed to initialize camera');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {}
        landmarkerRef.current = null;
      }
    };
  }, [active, tracking, exerciseType]);

  function loop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarkerRef.current;
    if (!video || !canvas || !lm) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    if (video.readyState >= 2) {
      const result = lm.detectForVideo(video, performance.now());
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const landmarks = result?.landmarks?.[0];
        if (landmarks) {
          drawSkeleton(ctx, canvas.width, canvas.height, landmarks);
          analyzeRep(landmarks);
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }

  function drawSkeleton(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    landmarks: any[]
  ) {
    const connections: [number, number][] = [
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [11, 12],
      [11, 23],
      [12, 24],
      [23, 24],
      [23, 25],
      [25, 27],
      [24, 26],
      [26, 28],
    ];

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(249, 115, 22, 0.6)';
    ctx.shadowBlur = 8;
    for (const [a, b] of connections) {
      const A = landmarks[a];
      const B = landmarks[b];
      if (!A || !B || (A.visibility ?? 1) < 0.3 || (B.visibility ?? 1) < 0.3) continue;
      ctx.beginPath();
      ctx.moveTo(A.x * w, A.y * h);
      ctx.lineTo(B.x * w, B.y * h);
      ctx.stroke();
    }

    ctx.fillStyle = '#06b6d4';
    ctx.shadowBlur = 0;
    for (const lm of landmarks) {
      if ((lm.visibility ?? 1) < 0.3) continue;
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function analyzeRep(lms: any[]) {
    let elbowAngle: number | null = null;
    let kneeAngle: number | null = null;
    let hipAngle: number | null = null;

    const ls = lms[POSE_LANDMARKS.LEFT_SHOULDER];
    const le = lms[POSE_LANDMARKS.LEFT_ELBOW];
    const lw = lms[POSE_LANDMARKS.LEFT_WRIST];
    const lh = lms[POSE_LANDMARKS.LEFT_HIP];
    const lk = lms[POSE_LANDMARKS.LEFT_KNEE];
    const la = lms[POSE_LANDMARKS.LEFT_ANKLE];

    if (ls && le && lw) elbowAngle = angleAt(ls, le, lw);
    if (lh && lk && la) kneeAngle = angleAt(lh, lk, la);
    if (ls && lh && lk) hipAngle = angleAt(ls, lh, lk);

    let downThreshold = 90;
    let upThreshold = 160;
    let primary: number | null = null;

    if (['pushups', 'diamond_pushups', 'dips'].includes(exerciseType)) {
      primary = elbowAngle;
      downThreshold = 95;
      upThreshold = 155;
    } else if (['squats', 'jump_squats', 'lunges'].includes(exerciseType)) {
      primary = kneeAngle;
      downThreshold = 100;
      upThreshold = 165;
    } else if (exerciseType === 'pullups') {
      primary = elbowAngle;
      downThreshold = 60;
      upThreshold = 160;
    } else if (exerciseType === 'leg_raises') {
      primary = hipAngle;
      downThreshold = 100;
      upThreshold = 170;
    } else {
      primary = elbowAngle;
    }

    if (primary === null) return;

    const now = Date.now();
    const state = stateRef.current;

    if (state.phase === 'up' && primary < downThreshold) {
      state.phase = 'down';
    } else if (state.phase === 'down' && primary > upThreshold) {
      state.phase = 'up';
      if (now - state.lastRep > 600) {
        state.lastRep = now;
        onRep();
      }
    }

    // Form score: how symmetric and full the rep was
    const rs = lms[POSE_LANDMARKS.RIGHT_SHOULDER];
    const re = lms[POSE_LANDMARKS.RIGHT_ELBOW];
    const rw = lms[POSE_LANDMARKS.RIGHT_WRIST];
    let symmetryScore = 100;
    if (rs && re && rw && elbowAngle !== null) {
      const rightElbow = angleAt(rs, re, rw);
      const diff = Math.abs(rightElbow - elbowAngle);
      symmetryScore = Math.max(0, 100 - diff * 2);
    }

    const rangeScore = state.phase === 'up' ? 100 : Math.max(0, 100 - Math.abs(primary - downThreshold) * 1.5);
    const composite = Math.round((symmetryScore + rangeScore) / 2);
    formScoresRef.current.push(composite);
    if (formScoresRef.current.length > 30) formScoresRef.current.shift();

    const avg = Math.round(
      formScoresRef.current.reduce((s, v) => s + v, 0) / formScoresRef.current.length
    );

    const issues: string[] = [];
    if (symmetryScore < 70) issues.push('Asymmetric — drive both arms evenly');
    if (rangeScore < 60 && state.phase === 'down') issues.push('Go deeper for full range');
    onForm(avg, issues);
  }

  if (!active) return null;

  return (
    <div className="relative">
      {!tracking && (
        <button
          onClick={() => setTracking(true)}
          className="w-full glass-card rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Camera size={18} className="text-purple-300" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-display font-semibold text-dark-100 text-sm flex items-center gap-1.5">
              <Sparkles size={11} className="text-purple-300" />
              AI Form Check
            </p>
            <p className="text-[11px] text-dark-400">
              Use front camera for live form scoring + auto rep counting
            </p>
          </div>
        </button>
      )}

      {tracking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl overflow-hidden border border-purple-500/30 bg-black aspect-[4/3] shadow-ai-glow"
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
          />

          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <div className="px-2 py-1 rounded-lg backdrop-blur-md bg-black/40 border border-purple-500/30 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
              <Sparkles size={10} />
              {status === 'loading' ? 'Loading model…' : status === 'ready' ? 'Form Tracking' : 'Idle'}
            </div>
            <button
              onClick={() => setTracking(false)}
              className="px-2 py-1 rounded-lg backdrop-blur-md bg-black/40 border border-white/10 text-[10px] text-dark-200 flex items-center gap-1"
            >
              <CameraOff size={10} />
              Stop
            </button>
          </div>

          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
              <div className="text-center">
                <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
                <p className="font-semibold text-red-300 text-sm">Camera unavailable</p>
                <p className="text-xs text-dark-300 mt-1 max-w-xs">{error}</p>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                <p className="text-xs text-purple-300">Loading AI pose model…</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
