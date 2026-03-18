import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/models/User';
import { hashPassword, signToken } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      streak: 0,
      longestStreak: 0,
      totalWorkouts: 0,
      level: 1,
      xp: 0,
    });

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
      createdAt: user.createdAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: { token, user: safeUser },
        message: 'Account created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error during registration' },
      { status: 500 }
    );
  }
}
