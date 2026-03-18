import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExerciseSession from '@/lib/models/ExerciseSession';
import User from '@/lib/models/User';
import Group from '@/lib/models/Group';
import { Notification } from '@/lib/models/Notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';
import { calculateCalories } from '@/lib/utils/exercises';
import { computeVerificationScore, isVerified, getVerificationLevel } from '@/lib/utils/verification';
import { isToday, isYesterday } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const dateStr = searchParams.get('date');

    const query: Record<string, unknown> = { userId: payload.userId };
    if (dateStr) {
      const date = new Date(dateStr);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: date, $lt: nextDay };
    }

    const sessions = await ExerciseSession.find(query)
      .sort({ date: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await ExerciseSession.countDocuments(query);

    return NextResponse.json({ success: true, data: sessions, total });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const body = await req.json();
    const {
      exerciseType,
      duration,
      reps,
      sets = 1,
      sharedGroups = [],
      notes = '',
      sensorData = [],
    } = body;

    if (!exerciseType || duration === undefined) {
      return NextResponse.json(
        { success: false, error: 'exerciseType and duration are required' },
        { status: 400 }
      );
    }

    // Compute verification
    const verificationScore = computeVerificationScore(sensorData, duration, reps, exerciseType);
    const verified = isVerified(verificationScore.total);
    const verificationLevel = getVerificationLevel(sensorData);
    const caloriesBurned = calculateCalories(exerciseType, reps || 0, duration);

    const session = await ExerciseSession.create({
      userId: payload.userId,
      exerciseType,
      duration,
      reps: reps || 0,
      sets,
      motionScore: verificationScore.motionConsistency,
      verificationScore: verificationScore.total,
      verificationBreakdown: {
        motionConsistency: verificationScore.motionConsistency,
        repetitionPatternAccuracy: verificationScore.repetitionPatternAccuracy,
        orientationConsistency: verificationScore.orientationConsistency,
        sessionDuration: verificationScore.sessionDuration,
        intensityScore: verificationScore.intensityScore,
        partnerConfirmation: verificationScore.partnerConfirmation,
      },
      verified,
      verificationLevel,
      caloriesBurned,
      sharedGroups,
      notes,
      date: new Date(),
      sensorData: sensorData.slice(0, 100), // limit stored data
    });

    // Update user streak and stats
    const user = await User.findById(payload.userId);
    if (user) {
      const now = new Date();
      let newStreak = user.streak;

      if (user.lastWorkoutDate) {
        if (isToday(user.lastWorkoutDate)) {
          // Already worked out today, no streak change
        } else if (isYesterday(user.lastWorkoutDate)) {
          newStreak = user.streak + 1;
        } else {
          // Streak broken
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const newXp = user.xp + Math.round(verificationScore.total / 10) * 10 + (verified ? 50 : 10);
      const newLevel = Math.floor(newXp / 500) + 1;

      // Check for new badges
      const newBadges = [...user.badges];
      const badgeIds = newBadges.map((b) => b.id);

      if (!badgeIds.includes('first_workout') && user.totalWorkouts === 0) {
        newBadges.push({ id: 'first_workout', name: 'First Step', description: 'Completed your first workout!', icon: '🎉', earnedAt: now });
      }
      if (!badgeIds.includes('streak_7') && newStreak >= 7) {
        newBadges.push({ id: 'streak_7', name: '7-Day Warrior', description: '7 day streak!', icon: '🔥', earnedAt: now });
      }
      if (!badgeIds.includes('streak_30') && newStreak >= 30) {
        newBadges.push({ id: 'streak_30', name: 'Consistency Champion', description: '30 day streak!', icon: '👑', earnedAt: now });
      }
      if (!badgeIds.includes('verified_10') && user.totalWorkouts >= 9 && verified) {
        newBadges.push({ id: 'verified_10', name: 'Verified Athlete', description: '10 verified workouts!', icon: '✅', earnedAt: now });
      }

      await User.findByIdAndUpdate(payload.userId, {
        streak: newStreak,
        longestStreak: Math.max(user.longestStreak, newStreak),
        totalWorkouts: user.totalWorkouts + 1,
        lastWorkoutDate: now,
        xp: newXp,
        level: newLevel,
        badges: newBadges,
      });

      // Send streak milestone notification
      if ([7, 14, 30, 60, 100].includes(newStreak)) {
        await Notification.create({
          userId: payload.userId,
          type: 'streak_milestone',
          title: `🔥 ${newStreak}-Day Streak!`,
          message: `Amazing! You've maintained a ${newStreak}-day workout streak!`,
          data: { streak: newStreak },
        });
      }
    }

    // Notify group members
    if (sharedGroups.length > 0) {
      for (const groupId of sharedGroups) {
        const group = await Group.findById(groupId);
        if (!group) continue;

        // Update group member stats
        const memberIndex = group.members.findIndex(
          (m) => m.userId.toString() === payload.userId
        );
        if (memberIndex !== -1) {
          group.members[memberIndex].totalWorkouts += 1;
          group.totalWorkouts += 1;
          await group.save();
        }

        // Notify all other members
        const otherMembers = group.members.filter(
          (m) => m.userId.toString() !== payload.userId
        );

        const notifPromises = otherMembers.map((member) =>
          Notification.create({
            userId: member.userId,
            type: 'workout_shared',
            title: `💪 ${payload.name} just worked out!`,
            message: `${payload.name} completed ${exerciseType.replace(/_/g, ' ')} in ${group.name}`,
            data: { sessionId: session._id, groupId, exerciseType, reps, duration },
          })
        );
        await Promise.all(notifPromises);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: session,
        verificationScore,
        message: verified ? 'Workout verified! 🎉' : 'Workout saved (verification score below 60)',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save session' }, { status: 500 });
  }
}
