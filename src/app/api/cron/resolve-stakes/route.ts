export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Stake from '@/lib/models/Stake';
import User from '@/lib/models/User';
import ExerciseSession from '@/lib/models/ExerciseSession';
import { Notification } from '@/lib/models/Notification';
import { sendPushToUser } from '@/lib/utils/push';
import { verifyCronRequest } from '@/lib/utils/cronAuth';

/**
 * Hourly cron: find every active stake whose deadline has passed, recompute
 * progress, award/forfeit XP, and notify the user via push + in-app.
 */
export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  await connectDB();
  const now = new Date();

  const overdue = await Stake.find({
    status: 'active',
    deadline: { $lt: now },
  }).lean();

  let won = 0;
  let lost = 0;

  for (const stake of overdue) {
    const sessions = await ExerciseSession.find({
      userId: stake.userId,
      date: { $gte: stake.createdAt, $lte: stake.deadline },
    }).lean();

    let progress = 0;
    if (stake.goalType === 'workouts') progress = sessions.length;
    else if (stake.goalType === 'reps') progress = sessions.reduce((s, x) => s + (x.reps || 0), 0);
    else if (stake.goalType === 'duration') progress = sessions.reduce((s, x) => s + (x.duration || 0), 0);
    else if (stake.goalType === 'streak') {
      const u = await User.findById(stake.userId).lean();
      progress = u?.streak || 0;
    }

    const didWin = progress >= stake.target;
    if (didWin) {
      won++;
      await User.findByIdAndUpdate(stake.userId, { $inc: { xp: stake.stakeXP } });
    } else {
      lost++;
      await User.findByIdAndUpdate(stake.userId, { $inc: { xp: -stake.stakeXP } });
    }

    await Stake.findByIdAndUpdate(stake._id, {
      status: didWin ? 'won' : 'lost',
      progress,
      resolvedAt: now,
    });

    await Notification.create({
      userId: stake.userId,
      type: 'system',
      title: didWin ? `🏆 Stake won — +${stake.stakeXP} XP` : `💔 Stake lost — −${stake.stakeXP} XP`,
      message: didWin
        ? `You hit ${progress}/${stake.target} ${stake.goalType}. XP back in your account.`
        : `Reached ${progress}/${stake.target} ${stake.goalType}. ${stake.stakeXP} XP forfeited.`,
      data: { stakeId: stake._id },
    }).catch(() => {});

    sendPushToUser(stake.userId.toString(), {
      title: didWin ? '🏆 Stake won' : '💔 Stake lost',
      body: didWin
        ? `You hit your ${stake.goalType} goal. +${stake.stakeXP} XP returned.`
        : `Missed your ${stake.goalType} goal. −${stake.stakeXP} XP forfeited.`,
      url: '/profile',
      tag: `stake-${stake._id}`,
    }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    resolved: overdue.length,
    won,
    lost,
    at: now.toISOString(),
  });
}
