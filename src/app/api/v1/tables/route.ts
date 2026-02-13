import { NextRequest, NextResponse } from 'next/server';
import { listTables, createTable, type CreateTableInput } from '@/lib/table-store-kv';
import { getOrCreateGuestUser } from '@/lib/auth-kv';

export const runtime = 'edge';

/** GET /api/v1/tables — List all tables */
export async function GET() {
  const tables = await listTables();
  return NextResponse.json({ tables });
}

/** POST /api/v1/tables — Create a new table */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateGuestUser();
    const body = await req.json();
    const { name, smallBlind, bigBlind, minBuyIn, maxBuyIn, maxPlayers } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!smallBlind || !bigBlind || smallBlind <= 0 || bigBlind <= 0) {
      return NextResponse.json({ error: 'Valid blinds are required' }, { status: 400 });
    }
    if (bigBlind < smallBlind) {
      return NextResponse.json({ error: 'Big blind must be >= small blind' }, { status: 400 });
    }
    if (!minBuyIn || !maxBuyIn || minBuyIn <= 0 || maxBuyIn < minBuyIn) {
      return NextResponse.json({ error: 'Valid buy-in range is required' }, { status: 400 });
    }

    const input: CreateTableInput = {
      name: name.trim(),
      smallBlind: Number(smallBlind),
      bigBlind: Number(bigBlind),
      minBuyIn: Number(minBuyIn),
      maxBuyIn: Number(maxBuyIn),
      maxPlayers: Number(maxPlayers) || 6,
      createdBy: user.id,
    };

    const table = await createTable(input);
    return NextResponse.json({ table }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
