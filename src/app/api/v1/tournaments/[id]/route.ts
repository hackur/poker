/**
 * Phase 12: Tournament API - Details, Start, End
 * GET /api/v1/tournaments/[id] - Tournament details
 * PUT /api/v1/tournaments/[id] - Actions (start, pause, resume, cancel, register, eliminate, rebuy)
 * DELETE /api/v1/tournaments/[id] - Delete tournament
 */

export const runtime = 'edge';

import { getTournament, deleteTournament } from '@/lib/tournament-manager';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = getTournament(id);
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  return NextResponse.json({ tournament: tournament.getState() });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = getTournament(id);
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case 'start': {
      const result = tournament.start();
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ tournament: tournament.getState() });
    }
    case 'pause': {
      tournament.pause();
      return NextResponse.json({ tournament: tournament.getState() });
    }
    case 'resume': {
      tournament.resume();
      return NextResponse.json({ tournament: tournament.getState() });
    }
    case 'cancel': {
      tournament.cancel();
      return NextResponse.json({ tournament: tournament.getState() });
    }
    case 'register': {
      const result = tournament.register(body.player);
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ tournament: tournament.getState() });
    }
    case 'unregister': {
      const result = tournament.unregister(body.playerId);
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ tournament: tournament.getState() });
    }
    case 'eliminate': {
      const result = tournament.eliminatePlayer(body.playerId);
      return NextResponse.json({ ...result, tournament: tournament.getState() });
    }
    case 'rebuy': {
      const result = tournament.rebuy(body.playerId);
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ tournament: tournament.getState() });
    }
    case 'add-on': {
      const result = tournament.addOn(body.playerId);
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ tournament: tournament.getState() });
    }
    case 'report-match': {
      const result = tournament.reportMatchResult(body.matchId, body.winnerId);
      return NextResponse.json({ ...result, tournament: tournament.getState() });
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteTournament(id);
  if (!deleted) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
