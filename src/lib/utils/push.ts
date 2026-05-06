/**
 * Web Push helpers. Uses the `web-push` library with a self-generated VAPID
 * keypair — no external service required. Generate keys once with:
 *   npx web-push generate-vapid-keys
 * and put them in .env.local as VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.
 */

import webpush from 'web-push';
import PushSubscription from '@/lib/models/PushSubscription';

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:fittrack@example.com';

let configured = false;
function configure() {
  if (configured) return;
  if (PUBLIC_KEY && PRIVATE_KEY) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  }
}

export function getPublicKey(): string {
  return PUBLIC_KEY;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    console.warn('VAPID keys not configured — skipping push');
    return { sent: 0, failed: 0 };
  }
  configure();

  const subs = await PushSubscription.find({ userId });
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-96.png',
    url: payload.url || '/dashboard',
    tag: payload.tag || 'fittrack',
  });

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          body
        );
        sent++;
      } catch (err: any) {
        failed++;
        // Clean up dead endpoints
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
        }
      }
    })
  );

  return { sent, failed };
}
