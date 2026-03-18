import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import ExerciseSession from '@/lib/models/ExerciseSession';
import User from '@/lib/models/User';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const group = await Group.findById(params.id);
    if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

    // Only members can see leaderboard
    const isMember = group.members.some((m) => m.userId.toString() === payload.userId);
    if (!isMember) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

    const memberIds = group.members.map((m) => m.userId);

    // Get member stats
    const users = await User.find({ _id: { $in: memberIds } })
      .select('name level xp streak totalWorkouts badges')
      .lean();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'alltime'; // 'week' | 'month' | 'alltime'

    let dateFilter = {};
    if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { date: { $gte: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { date: { $gte: monthAgo } };
    }

    // Aggregate session stats per member
    const sessionStats = await ExerciseSession.aggregate([
      {
        $match: {
          userId: { $in: memberIds },
          sharedGroups: group._id,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$userId',
          totalWorkouts: { $sum: 1 },
          totalReps: { $sum: '$reps' },
          totalDuration: { $sum: '$duration' },
          totalCalories: { $sum: '$caloriesBurned' },
          avgVerification: { $avg: '$verificationScore' },
        },
      },
    ]);

    const statsMap = new Map(sessionStats.map((s) => [s._id.toString(), s]));

    const leaderboard = users
      .map((user, idx) => {
        const stats = statsMap.get(user._id.toString()) || {
          totalWorkouts: 0,
          totalReps: 0,
          totalDuration: 0,
          totalCalories: 0,
          avgVerification: 0,
        };
        return {
          userId: user._id,
          userName: user.name,
          level: user.level,
          xp: user.xp,
          streak: user.streak,
          totalWorkouts: stats.totalWorkouts,
          totalReps: stats.totalReps,
          totalCalories: Math.round(stats.totalCalories),
          avgVerification: Math.round(stats.avgVerification || 0),
          badges: user.badges?.slice(0, 3),
        };
      })
      .sort((a, b) => b.totalWorkouts - a.totalWorkouts || b.streak - a.streak)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
