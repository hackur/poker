/**
 * Phase 12: Tournament API - List/Create
 * GET /api/v1/tournaments - List all tournaments
 * POST /api/v1/tournaments - Create a new tournament
 */

export const runtime = 'edge';

import { createTournament, listTournaments, type TournamentConfig } from '@/lib/tournament-manager';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const tournaments = listTournaments();
  return NextResponse.json({ tournaments });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const config: TournamentConfig = {
      id: body.id || crypto.randomUUID(),
      name: body.name || 'Unnamed Tournament',
      type: body.type || 'sit-and-go',
      buyIn: body.buyIn ?? 100,
      maxPlayers: body.maxPlayers ?? 18,
      minPlayers: body.minPlayers ?? 2,
      startingChips: body.startingChips ?? 10000,
      blindSchedule: body.blindSchedule || 'standard',
      customBlindLevels: body.customBlindLevels,
      allowRebuys: body.allowRebuys ?? false,
      rebuyLevelCutoff: body.rebuyLevelCutoff,
      rebuyCost: body.rebuyCost,
      rebuyChips: body.rebuyChips,
      allowAddOn: body.allowAddOn ?? false,
      addOnCost: body.addOnCost,
      addOnChips: body.addOnChips,
      addOnAtLevel: body.addOnAtLevel,
      scheduledStartTime: body.scheduledStartTime,
      seatingMethod: body.seatingMethod || 'snake',
      payoutStructure: body.payoutStructure || 'standard',
      customPayoutPercentages: body.customPayoutPercentages,
      maxPerTable: body.maxPerTable ?? 9,
      minPerTable: body.minPerTable ?? 4,
    };

    const manager = createTournament(config);
    return NextResponse.json({ tournament: manager.getState() }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid tournament configuration' },
      { status: 400 }
    );
  }
}
