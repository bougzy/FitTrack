export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/models/User';
import ExerciseSession from '@/lib/models/ExerciseSession';
import { Notification } from '@/lib/models/Notification';
import { sendPushToUser } from '@/lib/utils/push';
import { verifyCronRequest } from '@/lib/utils/cronAuth';
import { startOfDay, subDays } from 'date-fns';

/**
 * Evening cron — runs once per day in the evening. Finds users with an
 * active streak (≥ 2 days) who haven't worked out today yet, and pushes
 * a "save your streak" nudge.
 *
 * Also pings group members of currently-active stakes that are within
 * 12 hours of their deadline.
 */
export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  await connectDB();
  const now = new Date();
  const today = startOfDay(now);

  const atRisk = await User.find({
    streak: { $gte: 2 },
    lastWorkoutDate: { $lt: today },
  })
    .select('_id name streak preferences')
    .lean();

  let pushed = 0;
  for (const user of atRisk) {
    if (user.preferences?.notificationsEnabled === false) continue;

    // Belt-and-braces: confirm no session today
    const hasToday = await ExerciseSession.exists({
      userId: user._id,
      date: { $gte: today },
    });
    if (hasToday) continue;

    pushed++;
    await Notification.create({
      userId: user._id,
      type: 'streak_milestone',
      title: `⏰ Streak at risk: ${user.streak} days`,
      message: `Get one workout in before midnight to keep it alive.`,
      data: { streak: user.streak, url: '/workout' },
    }).catch(() => {});

    sendPushToUser(user._id.toString(), {
      title: `⏰ ${user.streak}-day streak at risk`,
      body: `One workout before midnight keeps it alive.`,
      url: '/workout',
      tag: `streak-${user._id}`,
    }).catch(() => {});
  }

  // Stake deadline warnings — fires once when within 12h of deadline
  const Stake = (await import('@/lib/models/Stake')).default;
  const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const expiring = await Stake.find({
    status: 'active',
    deadline: { $gt: now, $lte: twelveHoursFromNow },
  }).lean();

  let stakeWarnings = 0;
  for (const stake of expiring) {
    stakeWarnings++;
    await Notification.create({
      userId: stake.userId,
      type: 'system',
      title: `⏳ Stake expires in <12h`,
      message: `${stake.progress}/${stake.target} ${stake.goalType} so far. ${stake.stakeXP} XP on the line.`,
      data: { stakeId: stake._id, url: '/profile' },
    }).catch(() => {});

    sendPushToUser(stake.userId.toString(), {
      title: `⏳ Stake expires soon`,
      body: `${stake.target - stake.progress} more ${stake.goalType} or you lose ${stake.stakeXP} XP.`,
      url: '/profile',
      tag: `stake-warn-${stake._id}`,
    }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    streakSavesSent: pushed,
    stakeWarningsSent: stakeWarnings,
    at: now.toISOString(),
  });
}
