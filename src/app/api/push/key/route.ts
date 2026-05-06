export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPublicKey } from '@/lib/utils/push';

export async function GET() {
  return NextResponse.json({ success: true, publicKey: getPublicKey() });
}
