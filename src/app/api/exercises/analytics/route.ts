export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExerciseSession from '@/lib/models/ExerciseSession';
import User from '@/lib/models/User';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';
import { subDays, startOfDay, format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '7'; // days
    const days = parseInt(period);

    const startDate = startOfDay(subDays(new Date(), days - 1));

    // Daily activity
    const sessions = await ExerciseSession.find({
      userId: payload.userId,
      date: { $gte: startDate },
    }).lean();

    // Build daily breakdown
    const dailyMap: Record<string, { workouts: number; reps: number; duration: number; calories: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      dailyMap[d] = { workouts: 0, reps: 0, duration: 0, calories: 0 };
    }

    sessions.forEach((s) => {
      const d = format(new Date(s.date), 'yyyy-MM-dd');
      if (dailyMap[d]) {
        dailyMap[d].workouts += 1;
        dailyMap[d].reps += s.reps || 0;
        dailyMap[d].duration += s.duration || 0;
        dailyMap[d].calories += s.caloriesBurned || 0;
      }
    });

    const dailyActivity = Object.entries(dailyMap).map(([date, stats]) => ({
      date,
      label: format(new Date(date), 'MMM d'),
      ...stats,
    }));

    // Exercise distribution
    const exerciseDist = sessions.reduce<Record<string, number>>((acc, s) => {
      acc[s.exerciseType] = (acc[s.exerciseType] || 0) + 1;
      return acc;
    }, {});

    const exerciseDistribution = Object.entries(exerciseDist)
      .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }))
      .sort((a, b) => b.count - a.count);

    // Totals
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalReps = sessions.reduce((sum, s) => sum + (s.reps || 0), 0);
    const totalCalories = sessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
    const verifiedCount = sessions.filter((s) => s.verified).length;
    const avgVerification = sessions.length
      ? Math.round(sessions.reduce((sum, s) => sum + s.verificationScore, 0) / sessions.length)
      : 0;

    // User overall stats
    const user = await User.findById(payload.userId).select('streak longestStreak totalWorkouts level xp badges').lean();

    return NextResponse.json({
      success: true,
      data: {
        dailyActivity,
        exerciseDistribution,
        totals: {
          workouts: sessions.length,
          duration: totalDuration,
          reps: totalReps,
          calories: Math.round(totalCalories),
          verified: verifiedCount,
          avgVerification,
        },
        user: {
          streak: user?.streak || 0,
          longestStreak: user?.longestStreak || 0,
          totalWorkouts: user?.totalWorkouts || 0,
          level: user?.level || 1,
          xp: user?.xp || 0,
          badges: user?.badges || [],
        },
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
