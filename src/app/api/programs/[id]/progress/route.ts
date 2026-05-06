export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Program from '@/lib/models/Program';
import ExerciseSession from '@/lib/models/ExerciseSession';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

/**
 * Auto-progress a program. Looks at the last sessions logged against this
 * program and bumps reps/durations if verification was solid.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const program = await Program.findById(params.id);
    if (!program) return NextResponse.json({ success: false, error: 'Program not found' }, { status: 404 });

    if (program.userId.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Only the owner can progress' }, { status: 403 });
    }

    if (!program.autoProgress) {
      return NextResponse.json({ success: false, error: 'Auto-progress is disabled' }, { status: 400 });
    }

    // Look at recent sessions tagged with this program (notes match `Program: ${name}`)
    const recent = await ExerciseSession.find({
      userId: payload.userId,
      notes: { $regex: `^Program: ${program.name}` },
    })
      .sort({ date: -1 })
      .limit(program.exercises.length * 4)
      .lean();

    if (recent.length === 0) {
      return NextResponse.json({ success: false, error: 'Run the program first to gather data' }, { status: 400 });
    }

    let bumped = 0;
    const newExercises = program.exercises.map((ex) => {
      const matches = recent.filter((s) => s.exerciseType === ex.exerciseType);
      if (matches.length === 0) return ex;

      const avgVerify = matches.reduce((s, m) => s + m.verificationScore, 0) / matches.length;
      const avgReps = matches.reduce((s, m) => s + (m.reps || 0), 0) / matches.length;
      const avgDur = matches.reduce((s, m) => s + (m.duration || 0), 0) / matches.length;

      // Only progress if average verification ≥ 65 AND user actually hit close to target
      if (avgVerify < 65) return ex;

      const next = { ...ex } as typeof ex;
      if (ex.targetReps && avgReps >= ex.targetReps * 0.9) {
        next.targetReps = ex.targetReps + (ex.targetReps < 20 ? 2 : 3);
        bumped++;
      } else if (ex.durationSeconds && avgDur >= ex.durationSeconds * 0.9) {
        next.durationSeconds = ex.durationSeconds + (ex.durationSeconds < 60 ? 10 : 15);
        bumped++;
      }
      return next;
    });

    if (bumped === 0) {
      return NextResponse.json({
        success: true,
        progressed: 0,
        message: 'No exercises met the threshold to progress yet — keep grinding.',
      });
    }

    program.exercises = newExercises;
    program.progressionLevel = (program.progressionLevel || 0) + 1;
    await program.save();

    return NextResponse.json({
      success: true,
      progressed: bumped,
      level: program.progressionLevel,
      data: program,
      message: `Progressed ${bumped} exercise${bumped === 1 ? '' : 's'} — Level ${program.progressionLevel}`,
    });
  } catch (error) {
    console.error('Program progress error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
