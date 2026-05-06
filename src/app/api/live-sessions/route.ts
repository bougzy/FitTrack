export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveWorkoutSession from '@/lib/models/LiveWorkoutSession';
import User from '@/lib/models/User';
import Group from '@/lib/models/Group';
import { Notification } from '@/lib/models/Notification';
import { sendPushToUser } from '@/lib/utils/push';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

/** GET — list public sessions currently waiting or active. */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'public';

    const token = extractTokenFromHeader(req.headers.get('authorization'));
    let userId: string | null = null;
    if (token) {
      try {
        userId = verifyToken(token).userId;
      } catch {}
    }

    const query: Record<string, unknown> =
      scope === 'mine' && userId
        ? { hostId: userId }
        : { isPublic: true, status: { $in: ['waiting', 'active'] } };

    const sessions = await LiveWorkoutSession.find(query)
      .select('-participants.heartRate')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({
      success: true,
      data: sessions.map((s) => ({
        ...s,
        participantCount: s.participants?.length || 0,
      })),
    });
  } catch (error) {
    console.error('List live sessions error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** POST — create a new live session and return the join code. */
export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const body = await req.json();
    const { title, exerciseType, programId, isPublic, maxParticipants, scheduledFor, groupId } = body;

    if (!title || !exerciseType) {
      return NextResponse.json(
        { success: false, error: 'title and exerciseType are required' },
        { status: 400 }
      );
    }

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    const session = await LiveWorkoutSession.create({
      hostId: payload.userId,
      hostName: user.name,
      title: title.trim(),
      exerciseType,
      programId: programId || undefined,
      isPublic: isPublic !== false,
      maxParticipants: Math.min(200, maxParticipants || 50),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      groupId: groupId || undefined,
    });

    // If broadcasting to a group, ping every member
    if (groupId) {
      const group = await Group.findById(groupId).lean();
      if (group) {
        const memberIds: string[] = group.members
          .map((m: any) => {
            const uid =
              m.userId && typeof m.userId === 'object' && m.userId._id
                ? m.userId._id.toString()
                : m.userId?.toString();
            return uid;
          })
          .filter((uid: string) => uid && uid !== payload.userId);

        await Promise.all(
          memberIds.map((uid) =>
            Notification.create({
              userId: uid,
              type: 'system',
              title: `🔴 ${user.name} is going live`,
              message: `"${title}" — tap to join`,
              data: { liveCode: session.joinCode, url: `/live/${session.joinCode}` },
            }).catch(() => {})
          )
        );
        memberIds.forEach((uid) =>
          sendPushToUser(uid, {
            title: `🔴 ${user.name} is going live`,
            body: `"${title}" — tap to join`,
            url: `/live/${session.joinCode}`,
            tag: `live-${session._id}`,
          }).catch(() => {})
        );
      }
    }

    return NextResponse.json(
      { success: true, data: session, message: 'Live session created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create live session error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
