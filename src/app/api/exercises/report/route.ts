import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExerciseSession from '@/lib/models/ExerciseSession';
import User from '@/lib/models/User';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';
import { format } from 'date-fns';
import { formatDuration } from '@/lib/utils/exercises';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    const date = new Date(dateStr);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const sessions = await ExerciseSession.find({
      userId: payload.userId,
      date: { $gte: date, $lt: nextDay },
    }).lean();

    const user = await User.findById(payload.userId).select('name streak longestStreak badges level xp').lean();

    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalReps = sessions.reduce((sum, s) => sum + s.reps, 0);
    const totalCalories = sessions.reduce((sum, s) => sum + s.caloriesBurned, 0);
    const avgVerification = sessions.length
      ? Math.round(sessions.reduce((sum, s) => sum + s.verificationScore, 0) / sessions.length)
      : 0;

    // Format WhatsApp message
    const exerciseLines = sessions
      .map(
        (s) =>
          `  • ${s.exerciseType.replace(/_/g, ' ')}: ${s.reps > 0 ? `${s.reps} reps` : ''} ${s.duration > 0 ? formatDuration(s.duration) : ''} (Score: ${s.verificationScore}/100 ${s.verified ? '✅' : '⚠️'})`
      )
      .join('\n');

    const whatsappText = `🏋️ *FitTrack Daily Report* — ${format(date, 'MMMM d, yyyy')}
━━━━━━━━━━━━━━━━━━━
👤 *${user?.name}* | Level ${user?.level} | 🔥 ${user?.streak} day streak

📋 *Today's Workouts:*
${exerciseLines || '  No workouts logged today'}

📊 *Summary:*
  ⏱ Total Time: ${formatDuration(totalDuration)}
  💪 Total Reps: ${totalReps}
  🔥 Calories: ~${Math.round(totalCalories)} kcal
  ✅ Avg Verification: ${avgVerification}/100

🏆 *Streak:* ${user?.streak} days | Best: ${user?.longestStreak} days
━━━━━━━━━━━━━━━━━━━
💪 Powered by FitTrack`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    return NextResponse.json({
      success: true,
      data: {
        report: {
          date: dateStr,
          sessions,
          totalDuration,
          totalReps,
          totalCalories: Math.round(totalCalories),
          avgVerification,
          streak: user?.streak,
          longestStreak: user?.longestStreak,
          level: user?.level,
          badges: user?.badges,
        },
        whatsappText,
        whatsappUrl,
      },
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
