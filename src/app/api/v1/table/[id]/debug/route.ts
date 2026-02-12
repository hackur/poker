export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { gameManager } from '@/lib/game-manager';

const HUMAN_PLAYER_ID = 'human-1';

/** POST /api/v1/table/[id]/debug — Debug actions (dev only) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { command, botId, field, value } = body;

  switch (command) {
    case 'reset':
      gameManager.resetGame(id, HUMAN_PLAYER_ID);
      break;

    case 'update_bot':
      if (botId && field && value !== undefined) {
        gameManager.updateBot(id, botId, field, value);
      }
      break;

    default:
      return NextResponse.json({ error: 'Unknown debug command' }, { status: 400 });
  }

  const view = gameManager.getView(id, HUMAN_PLAYER_ID);
  return NextResponse.json(view);
}
