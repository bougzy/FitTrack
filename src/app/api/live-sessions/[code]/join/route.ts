export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveWorkoutSession from '@/lib/models/LiveWorkoutSession';
import User from '@/lib/models/User';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const session = await LiveWorkoutSession.findOne({ joinCode: params.code.toUpperCase() });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'ended') {
      return NextResponse.json({ success: false, error: 'This session has ended' }, { status: 410 });
    }

    const existing = session.participants.findIndex(
      (p) => p.userId.toString() === payload.userId
    );

    if (existing === -1) {
      if (session.participants.length >= session.maxParticipants) {
        return NextResponse.json({ success: false, error: 'Session is full' }, { status: 403 });
      }
      const user = await User.findById(payload.userId).select('name').lean();
      session.participants.push({
        userId: payload.userId as any,
        name: user?.name || 'Member',
        joinedAt: new Date(),
        reps: 0,
        durationSeconds: 0,
        status: 'joined',
        finalScore: 0,
        lastPingAt: new Date(),
      });
      await session.save();
    } else {
      // Re-joining — refresh ping
      session.participants[existing].lastPingAt = new Date();
      session.participants[existing].status = 'joined';
      await session.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: session._id,
        joinCode: session.joinCode,
        title: session.title,
        hostName: session.hostName,
        status: session.status,
        exerciseType: session.exerciseType,
      },
      message: `Welcome to ${session.title}`,
    });
  } catch (error) {
    console.error('Join live session error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const session = await LiveWorkoutSession.findOne({ joinCode: params.code.toUpperCase() });
    if (!session) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    session.participants = session.participants.filter(
      (p) => p.userId.toString() !== payload.userId
    );
    await session.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave live session error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
