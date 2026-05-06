export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LivePresence from '@/lib/models/LivePresence';
import Group from '@/lib/models/Group';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';
import { subSeconds } from 'date-fns';

/** GET — list everyone currently working out in the group (last 90s of pings). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const group = await Group.findById(params.id).lean();
    if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    const isMember = group.members.some((m: any) => {
      const uid =
        m.userId && typeof m.userId === 'object' && m.userId._id
          ? m.userId._id.toString()
          : m.userId?.toString();
      return uid === payload.userId;
    });
    if (!isMember) return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });

    const cutoff = subSeconds(new Date(), 90);
    const live = await LivePresence.find({
      groupId: params.id,
      finished: false,
      lastPingAt: { $gte: cutoff },
    })
      .populate('userId', 'name level')
      .sort({ startedAt: 1 })
      .lean();

    return NextResponse.json({ success: true, data: live, count: live.length });
  } catch (error) {
    console.error('Live GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** POST — heartbeat ping. Upsert presence record. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { exerciseType, reps, durationSeconds, heartRate, finished } = await req.json();

    if (finished) {
      await LivePresence.findOneAndUpdate(
        { userId: payload.userId, groupId: params.id },
        { finished: true, lastPingAt: new Date() }
      );
      return NextResponse.json({ success: true });
    }

    const presence = await LivePresence.findOneAndUpdate(
      { userId: payload.userId, groupId: params.id },
      {
        userId: payload.userId,
        groupId: params.id,
        exerciseType: exerciseType || 'pushups',
        reps: reps || 0,
        durationSeconds: durationSeconds || 0,
        heartRate,
        lastPingAt: new Date(),
        finished: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, data: presence });
  } catch (error) {
    console.error('Live POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
