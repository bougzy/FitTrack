import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    const group = await Group.findOne({ inviteCode: code.toUpperCase() })
      .select('name description privacy members totalWorkouts inviteCode _id')
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite code. This group may not exist.' },
        { status: 404 }
      );
    }

    const alreadyMember = group.members.some(
      (m: any) => m.userId?.toString() === payload.userId
    );

    return NextResponse.json({
      success: true,
      data: {
        group: {
          _id: group._id,
          name: group.name,
          description: group.description,
          privacy: group.privacy,
          totalWorkouts: group.totalWorkouts,
          members: group.members,
          inviteCode: group.inviteCode,
        },
        alreadyMember,
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}