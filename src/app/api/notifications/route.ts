import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import { Notification } from '@/lib/models/Notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '30');

    const query: Record<string, unknown> = { userId: payload.userId };
    if (unreadOnly) query.read = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({ userId: payload.userId, read: false });

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { notificationId, markAllRead } = await req.json();

    if (markAllRead) {
      await Notification.updateMany({ userId: payload.userId }, { read: true });
      return NextResponse.json({ success: true, message: 'All marked as read' });
    }

    if (notificationId) {
      await Notification.findOneAndUpdate(
        { _id: notificationId, userId: payload.userId },
        { read: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
