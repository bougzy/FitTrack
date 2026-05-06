export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import RecoveryCheckin from '@/lib/models/RecoveryCheckin';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';
import { startOfDay, subDays } from 'date-fns';
import { computeReadiness } from '@/lib/utils/recovery';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const days = Math.max(1, Math.min(60, parseInt(searchParams.get('days') || '7')));

    const start = subDays(startOfDay(new Date()), days - 1);
    const checkins = await RecoveryCheckin.find({
      userId: payload.userId,
      date: { $gte: start },
    })
      .sort({ date: -1 })
      .lean();

    const today = startOfDay(new Date());
    const latest = checkins.find((c) => c.date.getTime() === today.getTime()) || null;

    return NextResponse.json({
      success: true,
      data: {
        history: checkins,
        today: latest,
        avgReadiness:
          checkins.length > 0
            ? Math.round(checkins.reduce((s, c) => s + c.readinessScore, 0) / checkins.length)
            : null,
      },
    });
  } catch (error) {
    console.error('Recovery GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const body = await req.json();
    const { sleepHours, soreness, energy, mood, restingHR, notes } = body;

    const date = startOfDay(new Date());
    const score = computeReadiness({
      sleepHours: sleepHours ?? 7,
      soreness: soreness ?? 3,
      energy: energy ?? 3,
      mood: mood ?? 3,
      restingHR,
    });

    const checkin = await RecoveryCheckin.findOneAndUpdate(
      { userId: payload.userId, date },
      {
        userId: payload.userId,
        date,
        sleepHours: sleepHours ?? 7,
        soreness: soreness ?? 3,
        energy: energy ?? 3,
        mood: mood ?? 3,
        restingHR,
        readinessScore: score,
        notes: notes ?? '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, data: checkin, message: 'Check-in saved' });
  } catch (error) {
    console.error('Recovery POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
