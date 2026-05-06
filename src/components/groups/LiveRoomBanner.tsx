'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '@/hooks/useApi';
import { Activity, Users } from 'lucide-react';
import { EXERCISE_CONFIGS } from '@/lib/utils/exercises';

/**
 * Live presence banner for a group page — polls /api/groups/[id]/live every
 * 8 seconds and shows who is currently mid-workout.
 */
export function LiveRoomBanner({ groupId }: { groupId: string }) {
  const { request } = useApi();
  const [live, setLive] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const res = await request<any>(`/api/groups/${groupId}/live`, { showError: false });
      if (!cancelled && res?.success) setLive(res.data || []);
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [groupId, request]);

  return (
    <AnimatePresence>
      {live.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/15 to-emerald-500/5 backdrop-blur-md p-3"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-green-300">
                {live.length} live now
              </p>
            </div>
            <div className="space-y-1">
              {live.slice(0, 4).map((p) => {
                const cfg = EXERCISE_CONFIGS[p.exerciseType];
                return (
                  <div key={p._id} className="flex items-center gap-2 text-xs">
                    <span className="w-6 h-6 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-sm">
                      {cfg?.icon || '💪'}
                    </span>
                    <span className="font-semibold text-dark-100">{p.userId?.name || 'Member'}</span>
                    <span className="text-dark-300">
                      {cfg?.label || p.exerciseType} · {p.reps} reps
                    </span>
                    {p.heartRate && (
                      <span className="ml-auto text-[10px] text-red-300">❤️ {p.heartRate}</span>
                    )}
                  </div>
                );
              })}
              {live.length > 4 && (
                <p className="text-[10px] text-dark-400 pt-1">+ {live.length - 4} more…</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
