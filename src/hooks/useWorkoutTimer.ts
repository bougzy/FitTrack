'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export function useWorkoutTimer(isActive: boolean, isPaused: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const start = useCallback(() => {
    startTimeRef.current = Date.now() - elapsedRef.current * 1000;
  }, []);

  const reset = useCallback(() => {
    setSeconds(0);
    elapsedRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (isActive && !isPaused) {
      start();
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSeconds(elapsed);
        elapsedRef.current = elapsed;
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPaused, start]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return { seconds, formattedTime: formatTime(seconds), reset };
}
