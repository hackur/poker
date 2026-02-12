import { NextRequest, NextResponse } from 'next/server';
import { joinTable, tableToView } from '@/lib/table-store';

export const runtime = 'edge';

/** POST /api/v1/tables/[id]/join — Join a table */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { playerId, displayName, buyIn } = body;

    if (!playerId || !displayName) {
      return NextResponse.json({ error: 'playerId and displayName are required' }, { status: 400 });
    }
    if (!buyIn || buyIn <= 0) {
      return NextResponse.json({ error: 'Valid buyIn is required' }, { status: 400 });
    }

    const result = joinTable(id, playerId, displayName, Number(buyIn));
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ table: tableToView(result.table) });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
