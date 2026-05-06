export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveWorkoutSession from '@/lib/models/LiveWorkoutSession';
import { Notification } from '@/lib/models/Notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

/** Host ends the session — finalises participants and locks the leaderboard. */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const session = await LiveWorkoutSession.findOne({ joinCode: params.code.toUpperCase() });
    if (!session) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    if (session.hostId.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Only the host can end this session' }, { status: 403 });
    }

    session.status = 'ended';
    session.endedAt = new Date();
    session.participants.forEach((p) => {
      if (p.status !== 'finished') p.status = 'finished';
      // Score: reps relative to host with HR bonus
      const hostReps = Math.max(1, session.hostReps);
      const ratio = Math.min(1.5, p.reps / hostReps);
      p.finalScore = Math.round(ratio * 80 + (p.heartRate ? 10 : 0) + 10);
    });
    await session.save();

    // Notify participants
    await Promise.all(
      session.participants.map((p) =>
        Notification.create({
          userId: p.userId,
          type: 'system',
          title: `🏁 ${session.title} ended`,
          message: `You logged ${p.reps} reps in ${Math.round(p.durationSeconds / 60)} min. Tap to see leaderboard.`,
          data: { liveCode: session.joinCode, url: `/live/${session.joinCode}` },
        }).catch(() => {})
      )
    );

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('End live session error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
