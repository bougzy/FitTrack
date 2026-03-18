import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import User from '@/lib/models/User';
import { GroupInvitation, Notification } from '@/lib/models/Notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

// POST /api/groups/join  { inviteCode } or { groupId } for public groups
export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { inviteCode, groupId } = await req.json();

    let group;
    if (inviteCode) {
      group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    } else if (groupId) {
      group = await Group.findById(groupId);
    }

    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found or invalid code' }, { status: 404 });
    }

    // Check already a member
    const alreadyMember = group.members.some(
      (m) => m.userId.toString() === payload.userId
    );
    if (alreadyMember) {
      return NextResponse.json({ success: false, error: 'Already a member of this group' }, { status: 409 });
    }

    // Public + autoAccept: join immediately
    if (group.privacy === 'public' && group.autoAccept) {
      group.members.push({
        userId: payload.userId as unknown as import('mongoose').Types.ObjectId,
        role: 'member',
        joinedAt: new Date(),
        streak: 0,
        totalWorkouts: 0,
      });
      await group.save();

      await User.findByIdAndUpdate(payload.userId, { $push: { groups: group._id } });

      // Notify admin
      await Notification.create({
        userId: group.owner,
        type: 'group_join_request',
        title: `${payload.name} joined ${group.name}`,
        message: `${payload.name} has joined your group via invite.`,
        data: { groupId: group._id, userId: payload.userId },
      });

      return NextResponse.json({ success: true, message: 'Joined group!', data: group });
    }

    // Invite code join (always allow if code is correct)
    if (inviteCode) {
      group.members.push({
        userId: payload.userId as unknown as import('mongoose').Types.ObjectId,
        role: 'member',
        joinedAt: new Date(),
        streak: 0,
        totalWorkouts: 0,
      });
      await group.save();
      await User.findByIdAndUpdate(payload.userId, { $push: { groups: group._id } });

      await Notification.create({
        userId: group.owner,
        type: 'group_join_request',
        title: `${payload.name} joined ${group.name}`,
        message: `${payload.name} joined via invite code.`,
        data: { groupId: group._id },
      });

      return NextResponse.json({ success: true, message: 'Joined group!', data: group });
    }

    // Private or public without autoAccept: create pending invitation
    const existing = await GroupInvitation.findOne({
      groupId: group._id,
      inviteeId: payload.userId,
      status: 'pending',
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Join request already pending' }, { status: 409 });
    }

    const invitation = await GroupInvitation.create({
      groupId: group._id,
      inviterId: payload.userId,
      inviteeId: payload.userId,
      status: 'pending',
    });

    // Notify group admin
    await Notification.create({
      userId: group.owner,
      type: 'group_join_request',
      title: `Join Request: ${group.name}`,
      message: `${payload.name} wants to join ${group.name}`,
      data: { invitationId: invitation._id, groupId: group._id, userId: payload.userId, userName: payload.name },
    });

    return NextResponse.json({ success: true, message: 'Join request sent to admin', data: invitation });
  } catch (error) {
    console.error('Join group error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
