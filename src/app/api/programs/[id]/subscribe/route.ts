export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Program from '@/lib/models/Program';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

/** Subscribe = clone a shared program into the user's own list. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const original = await Program.findById(params.id);
    if (!original) return NextResponse.json({ success: false, error: 'Program not found' }, { status: 404 });
    if (!original.shared) {
      return NextResponse.json({ success: false, error: 'Program is not public' }, { status: 403 });
    }
    if (original.userId.toString() === payload.userId) {
      return NextResponse.json({ success: false, error: 'You already own this program' }, { status: 400 });
    }

    const existing = await Program.findOne({
      userId: payload.userId,
      copiedFrom: original._id,
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        alreadySubscribed: true,
        message: 'Already in your library',
      });
    }

    const copy = await Program.create({
      userId: payload.userId,
      name: original.name,
      description: original.description,
      difficulty: original.difficulty,
      exercises: original.exercises.map((e: any) => ({
        exerciseType: e.exerciseType,
        targetReps: e.targetReps,
        durationSeconds: e.durationSeconds,
        sets: e.sets,
        restSeconds: e.restSeconds,
      })),
      estimatedMinutes: original.estimatedMinutes,
      autoProgress: original.autoProgress,
      shared: false,
      copiedFrom: original._id,
    });

    if (!original.subscribers.some((s) => s.toString() === payload.userId)) {
      original.subscribers.push(payload.userId as any);
      await original.save();
    }

    return NextResponse.json({
      success: true,
      data: copy,
      message: `${original.name} added to your library`,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
