'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotifications() {
  const token = useAuthStore((s) => s.token);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
  }, []);

  const subscribe = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    if (!supported || !token) return { ok: false, reason: 'Push not supported' };
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { ok: false, reason: 'Permission denied' };

      const keyRes = await fetch('/api/push/key').then((r) => r.json());
      const publicKey = keyRes?.publicKey;
      if (!publicKey) return { ok: false, reason: 'Server not configured for push (missing VAPID key)' };

      const reg = await navigator.serviceWorker.ready;
      // Cast to BufferSource — TS lib mismatch on Uint8Array<ArrayBufferLike>
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });

      const subRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sub.toJSON()),
      }).then((r) => r.json());

      if (!subRes.success) return { ok: false, reason: subRes.error };
      setSubscribed(true);
      return { ok: true };
    } catch (err: any) {
      console.error('Push subscribe failed:', err);
      return { ok: false, reason: err?.message || 'Subscription failed' };
    } finally {
      setBusy(false);
    }
  }, [supported, token]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !token) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported, token]);

  const sendTest = useCallback(async () => {
    if (!token) return;
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: '🔔 FitTrack', body: 'Push notifications are live.' }),
    });
  }, [token]);

  return { supported, permission, subscribed, busy, subscribe, unsubscribe, sendTest };
}
