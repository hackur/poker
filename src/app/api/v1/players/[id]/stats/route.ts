import { NextRequest, NextResponse } from 'next/server';
import { getPlayerStats, getAllPlayerStats } from '@/lib/player-stats';

export const runtime = 'edge';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Special: list all players
  if (id === '_all') {
    return NextResponse.json(getAllPlayerStats());
  }

  const stats = getPlayerStats(id);
  if (!stats) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }
  return NextResponse.json(stats);
}
