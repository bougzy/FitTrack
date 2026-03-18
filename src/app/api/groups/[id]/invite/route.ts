import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import User from '@/lib/models/User';
import { GroupInvitation, Notification } from '@/lib/models/Notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

// POST /api/groups/[id]/invite  { inviteeEmail } or { inviteeId }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const group = await Group.findById(params.id);
    if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

    const isAdmin = group.members.some(
      (m) => m.userId.toString() === payload.userId && m.role === 'admin'
    );
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Only admins can invite' }, { status: 403 });

    const { inviteeEmail, inviteeId } = await req.json();

    let invitee;
    if (inviteeId) {
      invitee = await User.findById(inviteeId).select('name email');
    } else if (inviteeEmail) {
      invitee = await User.findOne({ email: inviteeEmail.toLowerCase() }).select('name email');
    }

    if (!invitee) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check already member
    const alreadyMember = group.members.some((m) => m.userId.toString() === invitee._id.toString());
    if (alreadyMember) {
      return NextResponse.json({ success: false, error: 'User is already a member' }, { status: 409 });
    }

    // Check existing invite
    const existing = await GroupInvitation.findOne({
      groupId: group._id,
      inviteeId: invitee._id,
      status: 'pending',
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Invitation already sent' }, { status: 409 });
    }

    const invitation = await GroupInvitation.create({
      groupId: group._id,
      inviterId: payload.userId,
      inviteeId: invitee._id,
      inviteeEmail: invitee.email,
      status: 'pending',
    });

    await Notification.create({
      userId: invitee._id,
      type: 'group_invite',
      title: `You're invited to ${group.name}!`,
      message: `${payload.name} invited you to join the group "${group.name}"`,
      data: { invitationId: invitation._id, groupId: group._id, groupName: group.name },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${invitee.name}`,
      data: invitation,
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// Accept or reject an invitation (by the invitee)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { invitationId, action } = await req.json();

    const invitation = await GroupInvitation.findOne({
      _id: invitationId,
      inviteeId: payload.userId,
      status: 'pending',
    });

    if (!invitation) return NextResponse.json({ success: false, error: 'Invitation not found' }, { status: 404 });

    invitation.status = action === 'accept' ? 'accepted' : 'rejected';
    await invitation.save();

    if (action === 'accept') {
      const group = await Group.findById(params.id);
      if (group) {
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
          userId: invitation.inviterId,
          type: 'group_invite',
          title: `${payload.name} accepted your invitation`,
          message: `${payload.name} joined ${group.name}`,
          data: { groupId: group._id },
        });
      }
    }

    return NextResponse.json({ success: true, message: `Invitation ${action}ed` });
  } catch (error) {
    console.error('Invitation response error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
