export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Program from '@/lib/models/Program';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const program = await Program.findById(params.id).lean();
    if (!program) {
      return NextResponse.json({ success: false, error: 'Program not found' }, { status: 404 });
    }

    if (!program.shared && program.userId.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: program });
  } catch (error) {
    console.error('Get program error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Mark as started — increment counter
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    verifyToken(token);
    await connectDB();

    const { action } = await req.json();
    if (action === 'start') {
      await Program.findByIdAndUpdate(params.id, { $inc: { timesStarted: 1 } });
    } else if (action === 'complete') {
      await Program.findByIdAndUpdate(params.id, { $inc: { timesCompleted: 1 } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Program action error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const program = await Program.findById(params.id);
    if (!program) return NextResponse.json({ success: false, error: 'Program not found' }, { status: 404 });

    if (program.userId.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can edit this program' }, { status: 403 });
    }

    const updates = await req.json();
    delete updates._id;
    delete updates.userId;

    const updated = await Program.findByIdAndUpdate(params.id, { $set: updates }, { new: true });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update program error:', error);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const program = await Program.findById(params.id);
    if (!program) return NextResponse.json({ success: false, error: 'Program not found' }, { status: 404 });

    if (program.userId.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can delete this program' }, { status: 403 });
    }

    await Program.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: 'Program deleted' });
  } catch (error) {
    console.error('Delete program error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
