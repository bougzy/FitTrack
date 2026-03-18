import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/models/User';
import { hashPassword } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, newPassword } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether email exists
      return NextResponse.json({
        success: true,
        message: 'If that email exists, password has been reset.',
      });
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      const passwordHash = await hashPassword(newPassword);
      await User.findByIdAndUpdate(user._id, { passwordHash });
      return NextResponse.json({ success: true, message: 'Password reset successfully' });
    }

    // Step 1: verify email exists
    return NextResponse.json({
      success: true,
      message: 'Email verified. You can now set a new password.',
      emailVerified: true,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
