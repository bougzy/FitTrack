import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/models/User';
import { comparePassword, signToken } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const safeUser = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      streak: user.streak,
      longestStreak: user.longestStreak,
      totalWorkouts: user.totalWorkouts,
      level: user.level,
      xp: user.xp,
      badges: user.badges,
      preferences: user.preferences,
      groups: user.groups,
      accountabilityPartners: user.accountabilityPartners,
      lastWorkoutDate: user.lastWorkoutDate,
      createdAt: user.createdAt,
    };

    return NextResponse.json({
      success: true,
      data: { token, user: safeUser },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error during login' },
      { status: 500 }
    );
  }
}
