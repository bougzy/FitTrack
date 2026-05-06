export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';
import { sendPushToUser } from '@/lib/utils/push';

/** Self-test endpoint — sends a push to the authenticated user. */
export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const { title, body, url } = await req.json();
    const result = await sendPushToUser(payload.userId, {
      title: title || '🔔 FitTrack',
      body: body || 'Your push setup works.',
      url: url || '/dashboard',
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
