export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getKVGameManager } from '@/lib/game-manager-kv';
import { getCurrentUser, getOrCreateGuestUser, getUserById } from '@/lib/auth-kv';

/**
 * Resolve and validate the player identity.
 * 
 * Priority:
 * 1. Cookie-based session (most secure — HttpOnly, SameSite)
 * 2. Provided playerId (validated against KV to confirm user exists)
 * 3. Auto-create guest user as last resort
 * 
 * This prevents spoofing: a client can't pass an arbitrary UUID and
 * impersonate another player unless that UUID exists in our user store.
 */
async function resolvePlayerId(providedId?: string | null): Promise<string> {
  // 1. Try cookie session first (strongest auth)
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser.id;

  // 2. Validate provided playerId exists in KV
  if (providedId) {
    const user = await getUserById(providedId);
    if (user) return user.id;
    // Invalid/unknown playerId — don't trust it, fall through
  }

  // 3. Create guest as last resort
  const guest = await getOrCreateGuestUser();
  return guest.id;
}

/** GET /api/v1/table/[id] — Get game state for the player */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(_request.url);
  const queryPlayerId = url.searchParams.get('playerId');

  const playerId = await resolvePlayerId(queryPlayerId);
  const manager = getKVGameManager();

  // Ensure game exists
  await manager.getOrCreate(id, playerId);

  // Get view (also ticks the game forward)
  const view = await manager.getView(id, playerId);
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
  const { action, playerId: bodyPlayerId } = body;

  const playerId = await resolvePlayerId(bodyPlayerId);

  if (!action || !action.type) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const manager = getKVGameManager();
  const success = await manager.submitAction(id, playerId, action);
  
  if (!success) {
    return NextResponse.json({ error: 'Not your turn or invalid action' }, { status: 400 });
  }

  // Return updated state
  const view = await manager.getView(id, playerId);
  return NextResponse.json(view);
}
