export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getKVGameManager } from '@/lib/game-manager-kv';
import { getCurrentUser, getOrCreateGuestUser, getUserById } from '@/lib/auth-kv';

/** POST /api/v1/table/[id]/move-seat — Move a player to a different seat */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { playerId: bodyPlayerId, toSeat } = body;

  // Authenticate: cookie → validated playerId → guest
  let playerId: string;
  const cookieUser = await getCurrentUser();
  if (cookieUser) {
    playerId = cookieUser.id;
  } else if (bodyPlayerId) {
    const user = await getUserById(bodyPlayerId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid player ID' }, { status: 401 });
    }
    playerId = user.id;
  } else {
    const guest = await getOrCreateGuestUser();
    playerId = guest.id;
  }

  if (toSeat === undefined || toSeat === null) {
    return NextResponse.json({ error: 'Missing toSeat' }, { status: 400 });
  }

  // Validate seat number
  const seatNum = Number(toSeat);
  if (!Number.isInteger(seatNum) || seatNum < 0 || seatNum > 8) {
    return NextResponse.json({ error: 'Invalid seat number (0-8)' }, { status: 400 });
  }

  const manager = getKVGameManager();
  const success = await manager.moveSeat(id, playerId, seatNum);

  if (!success) {
    return NextResponse.json(
      { error: 'Could not move seat. Seat may be occupied, invalid, or game in progress.' },
      { status: 400 }
    );
  }

  const view = await manager.getView(id, playerId);
  return NextResponse.json(view);
}
