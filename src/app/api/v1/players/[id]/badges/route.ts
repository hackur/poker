import { NextRequest, NextResponse } from 'next/server';
import { getPlayerBadges, getRanking, updateBadgeProgress } from '@/lib/elo-system';

export const runtime = 'edge';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const badges = getPlayerBadges(id);
  const ranking = getRanking(id);
  return NextResponse.json({
    playerId: id,
    badges,
    elo: ranking?.elo ?? null,
    totalWins: ranking?.totalWins ?? 0,
    totalWinnings: ranking?.totalWinnings ?? 0,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const newBadges = updateBadgeProgress(id, body.playerName ?? id, {
    won: body.won ?? false,
    chipsWon: body.chipsWon,
    wentAllIn: body.wentAllIn,
    currentStack: body.currentStack,
    startStack: body.startStack,
  });
  return NextResponse.json({ newBadges });
}
