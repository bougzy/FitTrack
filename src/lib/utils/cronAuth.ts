import { NextRequest } from 'next/server';

/**
 * Verify a cron request. Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`
 * automatically. Local/manual triggers must include the same header.
 *
 * Set CRON_SECRET in .env.local and Vercel project env.
 */
export function verifyCronRequest(req: NextRequest): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // If no secret is configured we still allow the call but log a warning.
    // This keeps local dev frictionless; production should always set the secret.
    console.warn('CRON_SECRET is not set — cron endpoints are unprotected.');
    return { ok: true };
  }

  const auth = req.headers.get('authorization') || '';
  if (auth === `Bearer ${secret}`) return { ok: true };

  // Vercel Cron also sends the secret as a `x-vercel-cron-signature` token
  // in newer projects. Accept either.
  const sig = req.headers.get('x-vercel-cron-signature');
  if (sig === secret) return { ok: true };

  return { ok: false, reason: 'Invalid CRON_SECRET' };
}
