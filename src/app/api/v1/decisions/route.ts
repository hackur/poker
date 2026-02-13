export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getKVGameManager } from '@/lib/game-manager-kv';

/** GET /api/v1/decisions?gameId=xxx — Get the bot decision log for a specific game */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ error: 'gameId query parameter required' }, { status: 400 });
  }

  const manager = getKVGameManager();
  
  // Load the game instance which contains the decisions
  const game = await (manager as any).loadGame(gameId);
  
  if (!game) {
    return NextResponse.json({ decisions: [] });
  }

  return NextResponse.json({ decisions: game.decisions || [] });
}
