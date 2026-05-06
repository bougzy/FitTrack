export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/models/User';
import RecoveryCheckin from '@/lib/models/RecoveryCheckin';
import { Notification } from '@/lib/models/Notification';
import { sendPushToUser } from '@/lib/utils/push';
import { verifyCronRequest } from '@/lib/utils/cronAuth';
import { startOfDay, subDays } from 'date-fns';
import { recommendPrograms } from '@/lib/utils/aiCoach';

/**
 * Morning cron — runs once per day. For each active user (worked out within
 * the last 14 days), pick the most relevant nudge:
 *   1. Recovery check-in if none today
 *   2. Streak save if streak >= 3 and last workout > 24h ago
 *   3. AI program suggestion otherwise
 *
 * Sends one push + in-app notification per user.
 */
export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
  }

  await connectDB();
  const now = new Date();
  const today = startOfDay(now);
  const fourteenDaysAgo = subDays(today, 14);

  const users = await User.find({
    $or: [
      { lastWorkoutDate: { $gte: fourteenDaysAgo } },
      { totalWorkouts: { $gte: 1 } },
    ],
  })
    .select('_id name streak level totalWorkouts lastWorkoutDate preferences')
    .lean();

  let recoveryNudges = 0;
  let streakNudges = 0;
  let aiNudges = 0;
  let inactiveNudges = 0;

  for (const user of users) {
    if (user.preferences?.notificationsEnabled === false) continue;

    const checkin = await RecoveryCheckin.findOne({
      userId: user._id,
      date: today,
    }).lean();

    let title: string;
    let body: string;
    let url = '/dashboard';
    let nudgeType: 'recovery' | 'streak' | 'ai' | 'inactive' = 'ai';

    const lastWorkout = user.lastWorkoutDate ? new Date(user.lastWorkoutDate) : null;
    const hoursSince = lastWorkout ? (now.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60) : Infinity;

    if (!checkin) {
      title = '☀️ Morning check-in';
      body = `Tell us how you slept — the AI coach will pick the right intensity for today.`;
      nudgeType = 'recovery';
      recoveryNudges++;
    } else if (user.streak >= 3 && hoursSince > 22) {
      title = `🔥 Save your ${user.streak}-day streak`;
      body = `One workout today keeps it alive. You've got this.`;
      url = '/workout';
      nudgeType = 'streak';
      streakNudges++;
    } else if (hoursSince > 72 && user.totalWorkouts > 0) {
      title = `👋 We miss you`;
      body = `It's been a few days — even 5 minutes counts. Jump back in?`;
      url = '/workout';
      nudgeType = 'inactive';
      inactiveNudges++;
    } else {
      const picks = recommendPrograms(
        {
          level: user.level || 1,
          streak: user.streak || 0,
          totalWorkouts: user.totalWorkouts || 0,
        },
        1
      );
      const pick = picks[0];
      if (!pick) continue;
      title = `🤖 Today's pick: ${pick.name}`;
      body = `${pick.estimatedMinutes} min · ${pick.reason}`;
      url = '/programs';
      nudgeType = 'ai';
      aiNudges++;
    }

    await Notification.create({
      userId: user._id,
      type: 'system',
      title,
      message: body,
      data: { nudgeType, url },
    }).catch(() => {});

    sendPushToUser(user._id.toString(), { title, body, url, tag: `nudge-${nudgeType}` }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    users: users.length,
    sent: { recovery: recoveryNudges, streak: streakNudges, ai: aiNudges, inactive: inactiveNudges },
    at: now.toISOString(),
  });
}
