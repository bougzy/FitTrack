import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import User from '@/lib/models/User';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

// DELETE /api/groups/[id]/members/[userId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
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
    // Allow self-removal too
    const isSelf = params.userId === payload.userId;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ success: false, error: 'Only admins can remove members' }, { status: 403 });
    }

    // Cannot remove the owner
    if (params.userId === group.owner.toString() && !isSelf) {
      return NextResponse.json({ success: false, error: 'Cannot remove group owner' }, { status: 400 });
    }

    group.members = group.members.filter((m) => m.userId.toString() !== params.userId);
    await group.save();

    await User.findByIdAndUpdate(params.userId, { $pull: { groups: group._id } });

    return NextResponse.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/groups/[id]/members/[userId] — change role
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const group = await Group.findById(params.id);
    if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

    if (group.owner.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Only the owner can change roles' }, { status: 403 });
    }

    const { role } = await req.json();
    const memberIdx = group.members.findIndex((m) => m.userId.toString() === params.userId);
    if (memberIdx === -1) return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });

    group.members[memberIdx].role = role;
    await group.save();

    return NextResponse.json({ success: true, message: `Role updated to ${role}` });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
