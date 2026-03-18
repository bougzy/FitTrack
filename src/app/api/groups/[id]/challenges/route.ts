import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import { Notification } from '@/lib/models/Notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

// GET /api/groups/[id]/challenges
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const group = await Group.findById(params.id);
    if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

    const isMember = group.members.some((m) => m.userId.toString() === payload.userId);
    if (!isMember) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

    const activeChallenges = group.challenges.filter((c) => c.active);
    return NextResponse.json({ success: true, data: activeChallenges });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// POST /api/groups/[id]/challenges — admin creates challenge
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const group = await Group.findById(params.id);
    if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

    const isAdmin = group.members.some(
      (m) => m.userId.toString() === payload.userId && m.role === 'admin'
    );
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Only admins can create challenges' }, { status: 403 });

    const { name, description, type, target, durationDays = 7 } = await req.json();

    if (!name || !type || !target) {
      return NextResponse.json({ success: false, error: 'name, type, and target are required' }, { status: 400 });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const challenge = {
      name,
      description: description || '',
      type,
      target,
      startDate,
      endDate,
      participants: group.members.map((m) => ({
        userId: m.userId,
        progress: 0,
        completed: false,
      })),
      active: true,
    };

    group.challenges.push(challenge as any);
    await group.save();

    // Notify all members
    const notifPromises = group.members.map((m) =>
      Notification.create({
        userId: m.userId,
        type: 'challenge_started',
        title: `🏆 New Challenge: ${name}`,
        message: `A new ${durationDays}-day challenge has started in ${group.name}! Target: ${target} ${type}`,
        data: { groupId: group._id, challengeName: name },
      })
    );
    await Promise.all(notifPromises);

    return NextResponse.json({
      success: true,
      data: challenge,
      message: 'Challenge started! All members notified.',
    }, { status: 201 });
  } catch (error) {
    console.error('Create challenge error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
