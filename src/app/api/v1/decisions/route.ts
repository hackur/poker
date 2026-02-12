import { NextResponse } from 'next/server';
import { getDecisionLog } from '@/lib/poker/bot';

/** GET /api/v1/decisions — Get the bot decision log */
export async function GET() {
  return NextResponse.json({ decisions: getDecisionLog() });
}
