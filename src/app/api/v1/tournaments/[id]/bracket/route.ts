/**
 * Phase 12: Bracket API
 * GET /api/v1/tournaments/[id]/bracket - Get bracket state
 */

export const runtime = 'edge';

import { getTournament } from '@/lib/tournament-manager';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = getTournament(id);
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  const bracket = tournament.getBracket();
  if (!bracket) {
    return NextResponse.json({ error: 'No bracket for this tournament type' }, { status: 404 });
  }

  return NextResponse.json({ bracket });
}
