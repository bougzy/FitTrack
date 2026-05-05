export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ProgressPost from '@/lib/models/ProgressPost';
import Group from '@/lib/models/Group';
import { Notification } from '@/lib/models/Notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = {};
    if (groupId) query.groupId = groupId;

    const posts = await ProgressPost.find(query)
      .populate('userId', 'name level')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error('List posts error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const body = await req.json();
    const { groupId, text, imageUrl, metrics } = body;

    if (!text?.trim() && !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Text or image is required' },
        { status: 400 }
      );
    }

    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
      const isMember = group.members.some(m => m.userId.toString() === payload.userId);
      if (!isMember) {
        return NextResponse.json({ success: false, error: 'Not a member of this group' }, { status: 403 });
      }
    }

    const post = await ProgressPost.create({
      userId: payload.userId,
      groupId: groupId || null,
      text: (text || '').trim(),
      imageUrl: imageUrl || '',
      metrics: metrics || {},
    });

    if (groupId) {
      const group = await Group.findById(groupId);
      if (group) {
        const others = group.members.filter(m => m.userId.toString() !== payload.userId);
        await Promise.all(
          others.map(m =>
            Notification.create({
              userId: m.userId,
              type: 'workout_shared',
              title: `📣 ${payload.name} posted in ${group.name}`,
              message: text?.slice(0, 100) || 'New progress update',
              data: { postId: post._id, groupId },
            }).catch(() => null)
          )
        );
      }
    }

    return NextResponse.json({ success: true, data: post, message: 'Posted!' }, { status: 201 });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ success: false, error: 'Failed to post' }, { status: 500 });
  }
}
