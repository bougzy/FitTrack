export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Stake from '@/lib/models/Stake';
import User from '@/lib/models/User';
import Group from '@/lib/models/Group';
import ExerciseSession from '@/lib/models/ExerciseSession';
import { Notification } from '@/lib/models/Notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const scope = searchParams.get('scope') || 'mine'; // 'mine' | 'group'

    const query: Record<string, unknown> =
      scope === 'group' && groupId ? { groupId } : { userId: payload.userId };

    const stakes = await Stake.find(query)
      .populate('userId', 'name level')
      .sort({ status: 1, deadline: 1 })
      .lean();

    // Update progress for active ones from session counts
    const now = new Date();
    for (const s of stakes) {
      if (s.status !== 'active') continue;
      if (new Date(s.deadline) < now) {
        // Auto-resolve overdue stakes
        await Stake.findByIdAndUpdate(s._id, {
          status: s.progress >= s.target ? 'won' : 'lost',
          resolvedAt: now,
        });
      }
    }

    return NextResponse.json({ success: true, data: stakes });
  } catch (error) {
    console.error('Stakes GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const body = await req.json();
    const { goalType, target, deadline, stakeXP, groupId, description } = body;

    if (!goalType || !target || !deadline || !stakeXP) {
      return NextResponse.json(
        { success: false, error: 'goalType, target, deadline, and stakeXP are required' },
        { status: 400 }
      );
    }

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ success: false, error: 'User missing' }, { status: 404 });
    if (user.xp < stakeXP) {
      return NextResponse.json(
        { success: false, error: `You need at least ${stakeXP} XP to stake this much` },
        { status: 400 }
      );
    }

    let witnesses: any[] = [];
    if (groupId) {
      const group = await Group.findById(groupId).lean();
      if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
      const isMember = group.members.some((m: any) => {
        const uid =
          m.userId && typeof m.userId === 'object' && m.userId._id
            ? m.userId._id.toString()
            : m.userId?.toString();
        return uid === payload.userId;
      });
      if (!isMember) {
        return NextResponse.json({ success: false, error: 'You must be a group member to stake here' }, { status: 403 });
      }
      witnesses = group.members
        .map((m: any) => (m.userId?._id ? m.userId._id : m.userId))
        .filter((id: any) => id?.toString() !== payload.userId);
    }

    const stake = await Stake.create({
      userId: payload.userId,
      groupId: groupId || undefined,
      goalType,
      target,
      progress: 0,
      deadline: new Date(deadline),
      stakeXP,
      witnesses,
      description: description || '',
    });

    if (groupId && witnesses.length > 0) {
      await Promise.all(
        witnesses.map((wid: any) =>
          Notification.create({
            userId: wid,
            type: 'system',
            title: `🎯 ${user.name} put up ${stakeXP} XP`,
            message: `Pledged ${target} ${goalType} by ${new Date(deadline).toLocaleDateString()}`,
            data: { stakeId: stake._id, groupId },
          }).catch(() => {})
        )
      );
    }

    return NextResponse.json(
      { success: true, data: stake, message: 'Stake locked. Win or lose your XP.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Stakes POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Resolve a stake: action 'cancel' (creator only) or auto win/loss is handled in GET
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { stakeId, action } = await req.json();
    const stake = await Stake.findById(stakeId);
    if (!stake) return NextResponse.json({ success: false, error: 'Stake not found' }, { status: 404 });
    if (stake.userId.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Not your stake' }, { status: 403 });
    }
    if (stake.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Already resolved' }, { status: 400 });
    }

    if (action === 'cancel') {
      stake.status = 'cancelled';
      stake.resolvedAt = new Date();
      await stake.save();
      return NextResponse.json({ success: true, data: stake, message: 'Stake cancelled' });
    }

    if (action === 'check') {
      // Recompute progress against sessions in window
      const sessions = await ExerciseSession.find({
        userId: payload.userId,
        date: { $gte: stake.createdAt, $lte: stake.deadline },
      }).lean();

      let progress = 0;
      if (stake.goalType === 'workouts') progress = sessions.length;
      else if (stake.goalType === 'reps') progress = sessions.reduce((s, x) => s + (x.reps || 0), 0);
      else if (stake.goalType === 'duration') progress = sessions.reduce((s, x) => s + (x.duration || 0), 0);
      else if (stake.goalType === 'streak') {
        const user = await User.findById(payload.userId);
        progress = user?.streak || 0;
      }
      stake.progress = progress;

      if (progress >= stake.target) {
        stake.status = 'won';
        stake.resolvedAt = new Date();
        await User.findByIdAndUpdate(payload.userId, { $inc: { xp: stake.stakeXP } });
      } else if (new Date(stake.deadline) < new Date()) {
        stake.status = 'lost';
        stake.resolvedAt = new Date();
        await User.findByIdAndUpdate(payload.userId, { $inc: { xp: -stake.stakeXP } });
      }
      await stake.save();
      return NextResponse.json({ success: true, data: stake });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Stakes PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
