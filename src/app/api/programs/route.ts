export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Program from '@/lib/models/Program';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'mine' | 'shared'

    const query: Record<string, unknown> =
      type === 'shared' ? { shared: true } : { userId: payload.userId };

    const programs = await Program.find(query).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ success: true, data: programs });
  } catch (error) {
    console.error('List programs error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load programs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const body = await req.json();
    const { name, description, difficulty, exercises, shared } = body;

    if (!name || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name and at least one exercise are required' },
        { status: 400 }
      );
    }

    // Estimate program duration: rough heuristic
    const estimatedMinutes = exercises.reduce((acc: number, e: any) => {
      const sets = e.sets || 1;
      const perSetSeconds =
        e.durationSeconds && e.durationSeconds > 0
          ? e.durationSeconds
          : (e.targetReps || 10) * 3;
      return acc + (perSetSeconds + (e.restSeconds || 30)) * sets;
    }, 0) / 60;

    const program = await Program.create({
      userId: payload.userId,
      name: name.trim(),
      description: (description || '').trim(),
      difficulty: difficulty || 'beginner',
      exercises: exercises.map((e: any) => ({
        exerciseType: e.exerciseType,
        targetReps: e.targetReps,
        durationSeconds: e.durationSeconds,
        sets: e.sets || 1,
        restSeconds: e.restSeconds ?? 30,
      })),
      estimatedMinutes: Math.round(estimatedMinutes),
      shared: !!shared,
    });

    return NextResponse.json(
      { success: true, data: program, message: 'Program created!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create program error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create program' }, { status: 500 });
  }
}
