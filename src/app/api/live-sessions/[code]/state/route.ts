export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveWorkoutSession from '@/lib/models/LiveWorkoutSession';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

/** GET — return current session state. Used by all clients to poll. */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    await connectDB();
    const session = await LiveWorkoutSession.findOne({ joinCode: params.code.toUpperCase() }).lean();
    if (!session) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Sort leaderboard
    const leaderboard = [...session.participants]
      .map((p) => ({
        userId: p.userId.toString(),
        name: p.name,
        reps: p.reps,
        durationSeconds: p.durationSeconds,
        heartRate: p.heartRate,
        status: p.status,
        finalScore: p.finalScore,
      }))
      .sort((a, b) => b.reps - a.reps);

    return NextResponse.json({
      success: true,
      data: {
        joinCode: session.joinCode,
        title: session.title,
        hostId: session.hostId.toString(),
        hostName: session.hostName,
        exerciseType: session.exerciseType,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        host: {
          reps: session.hostReps,
          durationSeconds: session.hostDurationSeconds,
          heartRate: session.hostHeartRate,
        },
        participants: leaderboard,
        participantCount: leaderboard.length,
      },
    });
  } catch (error) {
    console.error('Live state error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** POST — host or participant ping. */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const session = await LiveWorkoutSession.findOne({ joinCode: params.code.toUpperCase() });
    if (!session) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    if (session.status === 'ended') {
      return NextResponse.json({ success: false, error: 'Session ended' }, { status: 410 });
    }

    const body = await req.json();
    const { reps, durationSeconds, heartRate, status: newStatus, action, exerciseType } = body;

    const isHost = session.hostId.toString() === payload.userId;

    if (isHost) {
      // Host updating their own state OR session-level fields
      if (typeof reps === 'number') session.hostReps = reps;
      if (typeof durationSeconds === 'number') session.hostDurationSeconds = durationSeconds;
      if (typeof heartRate === 'number') session.hostHeartRate = heartRate;
      if (exerciseType) session.exerciseType = exerciseType;
      if (action === 'start' && session.status === 'waiting') {
        session.status = 'active';
        session.startedAt = new Date();
      }
      await session.save();
      return NextResponse.json({ success: true });
    }

    // Participant ping
    const idx = session.participants.findIndex((p) => p.userId.toString() === payload.userId);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Not joined' }, { status: 403 });
    }
    const p = session.participants[idx];
    if (typeof reps === 'number') p.reps = reps;
    if (typeof durationSeconds === 'number') p.durationSeconds = durationSeconds;
    if (typeof heartRate === 'number') p.heartRate = heartRate;
    if (newStatus) p.status = newStatus;
    p.lastPingAt = new Date();
    await session.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Live state POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
