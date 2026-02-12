export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getKVGameManager } from '@/lib/game-manager-kv';

const HUMAN_PLAYER_ID = 'human-1';

/** GET /api/v1/table/[id] — Get game state for the player */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const manager = getKVGameManager();

  // Ensure game exists
  await manager.getOrCreate(id, HUMAN_PLAYER_ID);

  // Get view (also ticks the game forward)
  const view = await manager.getView(id, HUMAN_PLAYER_ID);
  if (!view) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  return NextResponse.json(view);
}

/** POST /api/v1/table/[id] — Submit a player action */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  if (!action || !action.type) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const manager = getKVGameManager();
  const success = await manager.submitAction(id, HUMAN_PLAYER_ID, action);
  
  if (!success) {
    return NextResponse.json({ error: 'Not your turn or invalid action' }, { status: 400 });
  }

  // Return updated state
  const view = await manager.getView(id, HUMAN_PLAYER_ID);
  return NextResponse.json(view);
}
