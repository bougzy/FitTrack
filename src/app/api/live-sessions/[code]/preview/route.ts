export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveWorkoutSession from '@/lib/models/LiveWorkoutSession';

/** Public preview — no auth required. */
export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    await connectDB();
    const session = await LiveWorkoutSession.findOne({ joinCode: params.code.toUpperCase() })
      .select('hostId hostName title exerciseType status isPublic maxParticipants startedAt scheduledFor participants joinCode')
      .lean();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        joinCode: session.joinCode,
        title: session.title,
        host: { name: session.hostName },
        exerciseType: session.exerciseType,
        status: session.status,
        isPublic: session.isPublic,
        scheduledFor: session.scheduledFor,
        startedAt: session.startedAt,
        participantCount: session.participants?.length || 0,
        capacity: session.maxParticipants,
      },
    });
  } catch (error) {
    console.error('Preview live session error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
