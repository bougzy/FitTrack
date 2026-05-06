export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Program from '@/lib/models/Program';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { stars, comment } = await req.json();
    if (!stars || stars < 1 || stars > 5) {
      return NextResponse.json({ success: false, error: 'Stars must be 1–5' }, { status: 400 });
    }

    const program = await Program.findById(params.id);
    if (!program) return NextResponse.json({ success: false, error: 'Program not found' }, { status: 404 });
    if (!program.shared && program.userId.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Cannot rate private programs' }, { status: 403 });
    }
    if (program.userId.toString() === payload.userId) {
      return NextResponse.json({ success: false, error: 'Cannot rate your own program' }, { status: 400 });
    }

    const existing = program.ratings.findIndex((r) => r.userId.toString() === payload.userId);
    if (existing >= 0) {
      program.ratings[existing].stars = stars;
      program.ratings[existing].comment = comment || '';
    } else {
      program.ratings.push({
        userId: payload.userId as any,
        stars,
        comment: comment || '',
        createdAt: new Date(),
      });
    }

    program.ratingCount = program.ratings.length;
    program.avgRating =
      program.ratings.reduce((s, r) => s + r.stars, 0) / program.ratingCount;

    await program.save();

    return NextResponse.json({
      success: true,
      data: { avgRating: program.avgRating, ratingCount: program.ratingCount },
      message: 'Rating saved',
    });
  } catch (error) {
    console.error('Rate program error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
