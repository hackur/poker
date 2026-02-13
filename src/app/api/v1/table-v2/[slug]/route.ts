export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { gameManagerV2 } from '@/lib/game-manager-v2';
import { getOrCreateGuestUser } from '@/lib/auth-kv';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** GET /api/v1/table-v2/:slug — Get game state using BotPlayer system */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const user = await getOrCreateGuestUser();
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId') ?? user.id;

  const view = gameManagerV2.getView(slug, playerId);
  
  if (!view) {
    // Create new game if doesn't exist
    gameManagerV2.createGame({
      gameSlug: slug,
      humanPlayerId: playerId,
      botCount: slug.includes('heads-up') ? 1 : 5,
    });
    
    const newView = gameManagerV2.getView(slug, playerId);
    if (!newView) {
      return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
    }
    return NextResponse.json(newView);
  }

  return NextResponse.json(view);
}

/** POST /api/v1/table-v2/:slug — Submit an action */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const user = await getOrCreateGuestUser();
  const body = await request.json();
  const { playerId = user.id, action } = body;

  if (!action || !action.type) {
    return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  }

  const success = gameManagerV2.submitAction(slug, playerId, action);
  
  if (!success) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const view = gameManagerV2.getView(slug, playerId);
  return NextResponse.json(view);
}

/** DELETE /api/v1/table-v2/:slug — Reset game */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const user = await getOrCreateGuestUser();
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId') ?? user.id;

  gameManagerV2.resetGame(slug, playerId);

  return NextResponse.json({ reset: true });
}
