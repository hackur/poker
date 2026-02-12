/**
 * Phase 12: Payouts API
 * GET /api/v1/tournaments/[id]/payouts - Get prize distribution
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

  const state = tournament.getState();
  return NextResponse.json({
    prizePool: state.prizePool,
    payouts: state.payouts,
    leaderboard: state.leaderboard,
  });
}
