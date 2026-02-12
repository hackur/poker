export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getKVGameManager } from '@/lib/game-manager-kv';

const HUMAN_PLAYER_ID = 'human-1';

/** POST /api/v1/table/[id]/debug — Debug actions (dev only) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { command } = body;

  const manager = getKVGameManager();

  switch (command) {
    case 'reset':
      await manager.resetGame(id, HUMAN_PLAYER_ID);
      break;

    // Note: update_bot not supported in KV mode (would need to reload from KV)
    // Can be added later if needed

    default:
      return NextResponse.json({ error: 'Unknown debug command' }, { status: 400 });
  }

  const view = await manager.getView(id, HUMAN_PLAYER_ID);
  return NextResponse.json(view);
}
