export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Invite code is required' },
        { status: 400 }
      );
    }

    const group = await Group.findOne({
      inviteCode: code.toUpperCase().trim(),
    })
      .select('name description privacy members totalWorkouts inviteCode _id')
      .lean();

    if (!group) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid invite code. This group does not exist.',
        },
        { status: 404 }
      );
    }

    const alreadyMember = group.members.some((m: any) => {
      const uid =
        typeof m.userId === 'object'
          ? m.userId?.toString()
          : String(m.userId);
      return uid === payload.userId;
    });

    return NextResponse.json({
      success: true,
      data: {
        group: {
          _id: group._id.toString(),
          name: group.name,
          description: group.description || '',
          privacy: group.privacy,
          totalWorkouts: group.totalWorkouts || 0,
          memberCount: group.members.length,
          inviteCode: group.inviteCode,
        },
        alreadyMember,
      },
    });
  } catch (error) {
    console.error('Preview route error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}