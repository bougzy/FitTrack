import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';
import { v4 as uuidv4 } from 'uuid';

// POST /api/groups/[id]/regenerate-code
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
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Only admins can regenerate codes' }, { status: 403 });

    group.inviteCode = uuidv4().substring(0, 8).toUpperCase();
    await group.save();

    return NextResponse.json({
      success: true,
      data: { inviteCode: group.inviteCode },
      message: 'Invite code regenerated',
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
