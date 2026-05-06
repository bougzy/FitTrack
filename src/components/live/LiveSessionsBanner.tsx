'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { Radio, Users, ArrowRight } from 'lucide-react';
import { EXERCISE_CONFIGS } from '@/lib/utils/exercises';

/**
 * Dashboard widget — shows active public live sessions to discover.
 * Auto-refreshes every 30s. Hidden when there are none.
 */
export function LiveSessionsBanner() {
  const router = useRouter();
  const { request } = useApi();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await request<any>('/api/live-sessions?scope=public', { showError: false });
      if (res?.success) setSessions(res.data.filter((s: any) => s.status !== 'ended').slice(0, 3));
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [request]);

  return (
    <AnimatePresence>
      {sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5 text-red-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Live Now · {sessions.length}
            </p>
          </div>
          <div className="space-y-2">
            {sessions.map((s: any) => {
              const cfg = EXERCISE_CONFIGS[s.exerciseType];
              return (
                <motion.button
                  key={s._id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/live/${s.joinCode}`)}
                  className="w-full glass-card rounded-2xl p-3 text-left flex items-center gap-3 lift relative overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/15 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative w-10 h-10 rounded-xl glass-brand flex items-center justify-center text-xl flex-shrink-0">
                    {cfg?.icon || '💪'}
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <p className="font-display font-bold text-dark-50 text-sm truncate">{s.title}</p>
                    <p className="text-xs text-dark-400 truncate">
                      {s.hostName} · {cfg?.label || s.exerciseType}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-dark-500">
                      <span className="flex items-center gap-1">
                        <Radio size={9} className={s.status === 'active' ? 'text-red-400' : 'text-yellow-400'} />
                        {s.status === 'active' ? 'LIVE' : 'Lobby'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={9} /> {s.participantCount}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-dark-500 flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
