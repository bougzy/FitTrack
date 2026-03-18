import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import { GroupInvitation, Notification } from '@/lib/models/Notification';
import Group from '@/lib/models/Group';
import User from '@/lib/models/User';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const invitations = await GroupInvitation.find({
      $or: [{ inviteeId: payload.userId }, { inviterId: payload.userId }],
      status: 'pending',
    })
      .populate('groupId', 'name privacy')
      .populate('inviterId', 'name email')
      .populate('inviteeId', 'name email')
      .lean();

    return NextResponse.json({ success: true, data: invitations });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// Admin accepts/rejects join request
export async function PATCH(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { invitationId, action } = await req.json(); // action: 'accept' | 'reject'

    const invitation = await GroupInvitation.findById(invitationId);
    if (!invitation) return NextResponse.json({ success: false, error: 'Invitation not found' }, { status: 404 });

    const group = await Group.findById(invitation.groupId);
    if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

    // Only admin can approve
    const isAdmin = group.members.some(
      (m) => m.userId.toString() === payload.userId && m.role === 'admin'
    );
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Only admins can approve requests' }, { status: 403 });

    invitation.status = action === 'accept' ? 'accepted' : 'rejected';
    await invitation.save();

    if (action === 'accept' && invitation.inviteeId) {
      // Add member to group
      group.members.push({
        userId: invitation.inviteeId,
        role: 'member',
        joinedAt: new Date(),
        streak: 0,
        totalWorkouts: 0,
      });
      await group.save();

      await User.findByIdAndUpdate(invitation.inviteeId, {
        $push: { groups: group._id },
      });

      // Notify the new member
      await Notification.create({
        userId: invitation.inviteeId,
        type: 'group_invite',
        title: `Welcome to ${group.name}!`,
        message: `Your request to join ${group.name} has been approved.`,
        data: { groupId: group._id },
      });
    } else if (action === 'reject' && invitation.inviteeId) {
      await Notification.create({
        userId: invitation.inviteeId,
        type: 'group_invite',
        title: `Request to ${group.name}`,
        message: `Your request to join ${group.name} was not approved.`,
        data: { groupId: group._id },
      });
    }

    return NextResponse.json({ success: true, message: `Request ${action}ed` });
  } catch (error) {
    console.error('Invitation action error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
