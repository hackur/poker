import { NextRequest, NextResponse } from 'next/server';
import { gameManager } from '@/lib/game-manager';

const HUMAN_PLAYER_ID = 'human-1';

/** GET /api/table/[id] — Get game state for the player */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Create or get the game
  gameManager.getOrCreateDemo(HUMAN_PLAYER_ID);

  const view = gameManager.getView(id, HUMAN_PLAYER_ID);
  if (!view) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  return NextResponse.json(view);
}

/** POST /api/table/[id] — Submit a player action */
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

  const success = gameManager.submitAction(id, HUMAN_PLAYER_ID, action);
  if (!success) {
    return NextResponse.json({ error: 'Not your turn or invalid action' }, { status: 400 });
  }

  // Return updated state
  const view = gameManager.getView(id, HUMAN_PLAYER_ID);
  return NextResponse.json(view);
}
