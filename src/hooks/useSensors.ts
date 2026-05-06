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
  heartRate: number | null;
  hrConnected: boolean;
  hrError: string | null;
  steps: number;
  // Optional cycling power meter
  cyclingPower: number | null; // watts
  cyclingCadence: number | null; // rpm
  cyclingConnected: boolean;
  // Running speed and cadence
  runningSpeed: number | null; // m/s
  runningCadence: number | null; // strides per minute
  runningConnected: boolean;
}

interface UseSensorOptions {
  onSnapshot: (snapshot: ISensorSnapshot) => void;
  onRepDetected?: () => void;
  onStep?: () => void;
  pollIntervalMs?: number;
  exerciseType?: string;
}

const HEART_RATE_SERVICE = 'heart_rate';
const HEART_RATE_CHAR = 'heart_rate_measurement';
const CYCLING_POWER_SERVICE = 'cycling_power';
const CYCLING_POWER_MEASUREMENT = 'cycling_power_measurement';
const RUNNING_SPEED_SERVICE = 'running_speed_and_cadence';
const RUNNING_SPEED_MEASUREMENT = 'rsc_measurement';

export function useSensors({
  onSnapshot,
  onRepDetected,
  onStep,
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
    heartRate: null,
    hrConnected: false,
    hrError: null,
    steps: 0,
    cyclingPower: null,
    cyclingCadence: null,
    cyclingConnected: false,
    runningSpeed: null,
    runningCadence: null,
    runningConnected: false,
  });

  const isActiveRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const snapshotBufferRef = useRef<ISensorSnapshot[]>([]);
  const inRepRef = useRef(false);
  const inStepRef = useRef(false);
  const stepsRef = useRef(0);
  const readingCountRef = useRef(0);
  const lastStepAtRef = useRef(0);

  const currentAccRef = useRef({ x: 0, y: 0, z: 0 });
  const currentGyroRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const currentOrientRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);
  const currentGPSRef = useRef<{ lat: number; lng: number; speed: number } | null>(null);

  const hrDeviceRef = useRef<any>(null);
  const hrCharRef = useRef<any>(null);
  const cyclingDeviceRef = useRef<any>(null);
  const cyclingCharRef = useRef<any>(null);
  const runningDeviceRef = useRef<any>(null);
  const runningCharRef = useRef<any>(null);

  // ---------- Heart Rate (Web Bluetooth) ----------
  const hrConnect = useCallback(async () => {
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) {
        setState(s => ({ ...s, hrError: 'Web Bluetooth not supported on this device' }));
        return;
      }
      setState(s => ({ ...s, hrError: null }));
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
        optionalServices: [HEART_RATE_SERVICE],
      });
      hrDeviceRef.current = device;
      device.addEventListener('gattserverdisconnected', () => {
        setState(s => ({ ...s, hrConnected: false }));
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HEART_RATE_SERVICE);
      const char = await service.getCharacteristic(HEART_RATE_CHAR);
      hrCharRef.current = char;
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value as DataView;
        const flags = value.getUint8(0);
        const is16Bit = flags & 0x01;
        const bpm = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
        setState(s => ({ ...s, heartRate: bpm }));
      });
      setState(s => ({ ...s, hrConnected: true }));
    } catch (err: any) {
      setState(s => ({
        ...s,
        hrError: err?.message || 'Failed to pair heart rate monitor',
        hrConnected: false,
      }));
    }
  }, []);

  const hrDisconnect = useCallback(async () => {
    try {
      if (hrCharRef.current) await hrCharRef.current.stopNotifications().catch(() => {});
      if (hrDeviceRef.current?.gatt?.connected) hrDeviceRef.current.gatt.disconnect();
    } catch {
      // ignore
    }
    setState(s => ({ ...s, hrConnected: false, heartRate: null }));
  }, []);

  // ---------- Cycling Power Meter ----------
  const cyclingConnect = useCallback(async () => {
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) {
        setState(s => ({ ...s, hrError: 'Web Bluetooth not supported' }));
        return;
      }
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: [CYCLING_POWER_SERVICE] }],
        optionalServices: [CYCLING_POWER_SERVICE],
      });
      cyclingDeviceRef.current = device;
      device.addEventListener('gattserverdisconnected', () => {
        setState(s => ({ ...s, cyclingConnected: false }));
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(CYCLING_POWER_SERVICE);
      const char = await service.getCharacteristic(CYCLING_POWER_MEASUREMENT);
      cyclingCharRef.current = char;
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value as DataView;
        // Bytes 0-1: flags, 2-3: instantaneous power (signed int16, watts)
        const power = value.getInt16(2, true);
        setState(s => ({ ...s, cyclingPower: power }));
      });
      setState(s => ({ ...s, cyclingConnected: true }));
    } catch (err: any) {
      setState(s => ({ ...s, hrError: err?.message || 'Failed to pair power meter' }));
    }
  }, []);

  // ---------- Running Speed & Cadence ----------
  const runningConnect = useCallback(async () => {
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) {
        setState(s => ({ ...s, hrError: 'Web Bluetooth not supported' }));
        return;
      }
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: [RUNNING_SPEED_SERVICE] }],
        optionalServices: [RUNNING_SPEED_SERVICE],
      });
      runningDeviceRef.current = device;
      device.addEventListener('gattserverdisconnected', () => {
        setState(s => ({ ...s, runningConnected: false }));
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(RUNNING_SPEED_SERVICE);
      const char = await service.getCharacteristic(RUNNING_SPEED_MEASUREMENT);
      runningCharRef.current = char;
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value as DataView;
        // Byte 0: flags, 1-2: speed (uint16, m/s with resolution 1/256)
        const rawSpeed = value.getUint16(1, true);
        const speed = rawSpeed / 256;
        const cadence = value.getUint8(3); // strides per minute
        setState(s => ({ ...s, runningSpeed: speed, runningCadence: cadence }));
      });
      setState(s => ({ ...s, runningConnected: true }));
    } catch (err: any) {
      setState(s => ({ ...s, hrError: err?.message || 'Failed to pair running pod' }));
    }
  }, []);

  const cyclingDisconnect = useCallback(async () => {
    try {
      if (cyclingCharRef.current) await cyclingCharRef.current.stopNotifications().catch(() => {});
      if (cyclingDeviceRef.current?.gatt?.connected) cyclingDeviceRef.current.gatt.disconnect();
    } catch {
      // ignore
    }
    setState(s => ({ ...s, cyclingConnected: false, cyclingPower: null, cyclingCadence: null }));
  }, []);

  const runningDisconnect = useCallback(async () => {
    try {
      if (runningCharRef.current) await runningCharRef.current.stopNotifications().catch(() => {});
      if (runningDeviceRef.current?.gatt?.connected) runningDeviceRef.current.gatt.disconnect();
    } catch {
      // ignore
    }
    setState(s => ({ ...s, runningConnected: false, runningSpeed: null, runningCadence: null }));
  }, []);

  // ---------- Permissions ----------
  const requestPermissions = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permission !== 'granted') return false;
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  // ---------- Tracking ----------
  const startTracking = useCallback(async () => {
    const granted = await requestPermissions();
    if (!granted) {
      console.warn('Sensor permission denied — falling back to manual tracking');
      // Still allow tracking to proceed (poll will emit zeros) so the timer works
    }

    isActiveRef.current = true;
    stepsRef.current = 0;
    setState(s => ({ ...s, steps: 0 }));

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

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!isActiveRef.current) return;
      currentOrientRef.current = {
        alpha: e.alpha ?? 0,
        beta: e.beta ?? 0,
        gamma: e.gamma ?? 0,
      };
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('devicemotion', handleMotion, { passive: true });
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    let geoWatchId: number | null = null;
    if (['jogging', 'running'].includes(exerciseType) && typeof navigator !== 'undefined' && navigator.geolocation) {
      geoWatchId = navigator.geolocation.watchPosition(
        pos => {
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

    intervalRef.current = setInterval(() => {
      if (!isActiveRef.current) return;
      readingCountRef.current += 1;

      // Throttle if buffer is large (battery)
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

      const { x, y, z } = snapshot.accelerometer;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Rep detection (high amplitude)
      const repThreshold = 14;
      if (magnitude > repThreshold && !inRepRef.current) {
        inRepRef.current = true;
      } else if (magnitude < 9 && inRepRef.current) {
        inRepRef.current = false;
        onRepDetected?.();
      }

      // Step detection (lower threshold + debounce >250ms)
      const now = Date.now();
      const stepThresholdHigh = 11.5;
      const stepThresholdLow = 9.0;
      if (magnitude > stepThresholdHigh && !inStepRef.current && now - lastStepAtRef.current > 250) {
        inStepRef.current = true;
      } else if (magnitude < stepThresholdLow && inStepRef.current) {
        inStepRef.current = false;
        lastStepAtRef.current = now;
        stepsRef.current += 1;
        onStep?.();
        if (stepsRef.current % 5 === 0) {
          setState(s => ({ ...s, steps: stepsRef.current }));
        }
      }
    }, pollIntervalMs);

    // Cleanup function returned for callers that want it
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion);
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      if (geoWatchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(geoWatchId);
      }
    };
  }, [exerciseType, onSnapshot, onRepDetected, onStep, pollIntervalMs, requestPermissions]);

  const stopTracking = useCallback(() => {
    isActiveRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Flush final step count
    setState(s => ({ ...s, steps: stepsRef.current }));
  }, []);

  const getSnapshots = useCallback(() => snapshotBufferRef.current, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      hrDisconnect();
      cyclingDisconnect();
      runningDisconnect();
    };
  }, [hrDisconnect, cyclingDisconnect, runningDisconnect]);

  return {
    ...state,
    startTracking,
    stopTracking,
    getSnapshots,
    hrConnect,
    hrDisconnect,
    cyclingConnect,
    cyclingDisconnect,
    runningConnect,
    runningDisconnect,
  };
}
