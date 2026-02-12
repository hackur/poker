import { NextResponse } from 'next/server';
import { gameManager } from '@/lib/game-manager';

/** GET /api/v1/games — List all active games */
export async function GET() {
  return NextResponse.json({ games: gameManager.listGames() });
}
