'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ISensorSnapshot } from '@/types';

interface SensorState {
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number } | null;
  orientation: { alpha: number; beta: number; gamma: number } | null;
  gps: { lat: number; lng: number; speed: number } | null;
  isAvailable: boolean;
  permissionGranted: boolean;
  temperature: 'normal' | 'warm' | 'hot';
}

interface UseSensorOptions {
  onSnapshot: (snapshot: ISensorSnapshot) => void;
  onRepDetected?: () => void;
  pollIntervalMs?: number;
  exerciseType?: string;
}

export function useSensors({
  onSnapshot,
  onRepDetected,
  pollIntervalMs = 100,
  exerciseType = 'pushups',
}: UseSensorOptions) {
  const [state, setState] = useState<SensorState>({
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: null,
    orientation: null,
    gps: null,
    isAvailable: false,
    permissionGranted: false,
    temperature: 'normal',
  });

  const isActiveRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const snapshotBufferRef = useRef<ISensorSnapshot[]>([]);
  const lastRepMagnitudeRef = useRef(0);
  const inRepRef = useRef(false);
  const readingCountRef = useRef(0);

  const currentAccRef = useRef({ x: 0, y: 0, z: 0 });
  const currentGyroRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const currentOrientRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);
  const currentGPSRef = useRef<{ lat: number; lng: number; speed: number } | null>(null);

  const requestPermissions = useCallback(async () => {
    // iOS 13+ requires explicit permission for DeviceMotion
    if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permission !== 'granted') {
          return false;
        }
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  const startTracking = useCallback(async () => {
    const granted = await requestPermissions();
    if (!granted) {
      console.warn('Sensor permission denied');
      return false;
    }

    isActiveRef.current = true;

    // Accelerometer + DeviceMotion
    const handleMotion = (e: DeviceMotionEvent) => {
      if (!isActiveRef.current) return;
      const acc = e.accelerationIncludingGravity;
      if (acc) {
        currentAccRef.current = {
          x: acc.x ?? 0,
          y: acc.y ?? 0,
          z: acc.z ?? 0,
        };
      }
      if (e.rotationRate) {
        currentGyroRef.current = {
          x: e.rotationRate.alpha ?? 0,
          y: e.rotationRate.beta ?? 0,
          z: e.rotationRate.gamma ?? 0,
        };
      }
    };

    // Orientation
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!isActiveRef.current) return;
      currentOrientRef.current = {
        alpha: e.alpha ?? 0,
        beta: e.beta ?? 0,
        gamma: e.gamma ?? 0,
      };
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });

    // GPS for cardio
    let geoWatchId: number | null = null;
    if (['jogging', 'running'].includes(exerciseType) && navigator.geolocation) {
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          currentGPSRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed ?? 0,
          };
        },
        null,
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }

    // Poll and emit snapshots
    intervalRef.current = setInterval(() => {
      if (!isActiveRef.current) return;

      readingCountRef.current += 1;

      // Throttle to save battery - skip every other read
      if (readingCountRef.current % 2 !== 0 && snapshotBufferRef.current.length > 50) return;

      const snapshot: ISensorSnapshot = {
        timestamp: Date.now(),
        accelerometer: { ...currentAccRef.current },
        gyroscope: currentGyroRef.current ? { ...currentGyroRef.current } : undefined,
        orientation: currentOrientRef.current ? { ...currentOrientRef.current } : undefined,
        gps: currentGPSRef.current ? { ...currentGPSRef.current } : undefined,
      };

      snapshotBufferRef.current.push(snapshot);
      onSnapshot(snapshot);

      // Rep detection via magnitude threshold
      const { x, y, z } = snapshot.accelerometer;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      const threshold = 14;
      if (magnitude > threshold && !inRepRef.current) {
        inRepRef.current = true;
        lastRepMagnitudeRef.current = magnitude;
      } else if (magnitude < 9 && inRepRef.current) {
        inRepRef.current = false;
        onRepDetected?.();
      }

      setState((prev) => ({
        ...prev,
        accelerometer: { ...currentAccRef.current },
        gyroscope: currentGyroRef.current,
        orientation: currentOrientRef.current,
        gps: currentGPSRef.current,
        isAvailable: true,
        permissionGranted: true,
      }));
    }, pollIntervalMs);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
      if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
    };
  }, [exerciseType, onSnapshot, onRepDetected, pollIntervalMs, requestPermissions]);

  const stopTracking = useCallback(() => {
    isActiveRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const getSnapshots = useCallback(() => snapshotBufferRef.current, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    getSnapshots,
  };
}
