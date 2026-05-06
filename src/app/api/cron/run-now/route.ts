export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/utils/cronAuth';

/**
 * Manual trigger — pass ?job=resolve-stakes|morning-nudges|evening-streak-save
 * to invoke any cron route immediately. Useful for testing in dev.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        "http://localhost:3000/api/cron/run-now?job=resolve-stakes"
 */
const JOBS = ['resolve-stakes', 'morning-nudges', 'evening-streak-save'] as const;
type Job = (typeof JOBS)[number];

export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  const { searchParams, origin } = new URL(req.url);
  const job = searchParams.get('job') as Job | null;

  if (!job || !JOBS.includes(job)) {
    return NextResponse.json(
      { success: false, error: `job param required, one of: ${JOBS.join(', ')}` },
      { status: 400 }
    );
  }

  const secret = process.env.CRON_SECRET || '';
  const target = `${origin}/api/cron/${job}`;
  const res = await fetch(target, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
  const body = await res.json();
  return NextResponse.json({ success: res.ok, job, status: res.status, body });
}
