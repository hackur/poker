export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getKVGameManager } from '@/lib/game-manager-kv';
import { BOT_PROFILES } from '@/lib/poker/bot';
import { getCurrentUser, getOrCreateGuestUser, getUserById } from '@/lib/auth-kv';

/** POST /api/v1/table/[id]/add-bot — Add a bot to the game */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { botProfile, seat, playerId } = body;

  // Authenticate: cookie session → validated playerId → guest fallback
  let viewPlayerId: string;
  const cookieUser = await getCurrentUser();
  if (cookieUser) {
    viewPlayerId = cookieUser.id;
  } else if (playerId) {
    const user = await getUserById(playerId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid player ID' }, { status: 401 });
    }
    viewPlayerId = user.id;
  } else {
    const guest = await getOrCreateGuestUser();
    viewPlayerId = guest.id;
  }

  // Validate seat number if provided
  if (seat !== undefined && seat !== null) {
    if (typeof seat !== 'number' || seat < 0 || seat > 8 || !Number.isInteger(seat)) {
      return NextResponse.json({ error: 'Invalid seat number (0-8)' }, { status: 400 });
    }
  }

  // Validate bot profile
  const validProfiles = BOT_PROFILES.map(p => p.name);
  if (!botProfile || !validProfiles.includes(botProfile)) {
    return NextResponse.json(
      { error: `Invalid bot profile. Must be one of: ${validProfiles.join(', ')}` },
      { status: 400 }
    );
  }

  const manager = getKVGameManager();
  const success = await manager.addBot(id, botProfile, seat !== undefined ? Number(seat) : undefined);

  if (!success) {
    return NextResponse.json(
      { error: 'Could not add bot. Table may be full, seat occupied, or game in progress.' },
      { status: 400 }
    );
  }

  // Return updated state
  const view = await manager.getView(id, viewPlayerId);
  return NextResponse.json(view);
}
