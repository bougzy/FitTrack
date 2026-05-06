export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import PushSubscription from '@/lib/models/PushSubscription';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const sub = await req.json();
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: sub.endpoint },
      {
        userId: payload.userId,
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        userAgent: req.headers.get('user-agent') || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, message: 'Notifications enabled' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    verifyToken(token);
    await connectDB();
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ success: false, error: 'Endpoint required' }, { status: 400 });
    await PushSubscription.deleteOne({ endpoint });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
