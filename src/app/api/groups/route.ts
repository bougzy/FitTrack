import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import User from '@/lib/models/User';
import { GroupInvitation, Notification } from '@/lib/models/Notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'my' | 'public' | 'discover'

    if (type === 'public') {
      // Public directory - only public groups
      const groups = await Group.find({ privacy: 'public' })
        .select('-challenges -members.userId')
        .sort({ totalWorkouts: -1 })
        .limit(50)
        .lean();
      return NextResponse.json({ success: true, data: groups });
    }

    // My groups - only groups user is a member of
    const groups = await Group.find({
      'members.userId': payload.userId,
    })
      .populate('members.userId', 'name email level xp')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { name, description, privacy = 'private', autoAccept = false, category = 'general' } =
      await req.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Group name required' }, { status: 400 });
    }

    const group = await Group.create({
      name,
      description,
      owner: payload.userId,
      privacy,
      autoAccept,
      category,
      members: [
        {
          userId: payload.userId,
          role: 'admin',
          joinedAt: new Date(),
          streak: 0,
          totalWorkouts: 0,
        },
      ],
    });

    // Add group to user's groups array
    await User.findByIdAndUpdate(payload.userId, {
      $push: { groups: group._id },
    });

    return NextResponse.json(
      { success: true, data: group, message: 'Group created!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create group' }, { status: 500 });
  }
}
