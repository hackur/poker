export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getHandHistory, clearHandHistory } from '@/lib/hand-history';
import { getDecisionLog } from '@/lib/poker/bot';

/** GET /api/v1/history — Get hand history with associated bot decisions */
export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get('gameId') ?? undefined;
  let history = getHandHistory();
  if (gameId) history = history.filter((h) => h.gameId === gameId);

  // Attach decisions to each hand
  const decisions = getDecisionLog();
  const enriched = history.map((hand) => {
    const handDecisions = decisions.filter(
      (d) => d.gameId === hand.gameId && d.handNumber === hand.handNumber,
    );
    return { ...hand, decisions: handDecisions };
  });

  return NextResponse.json({ hands: enriched });
}

/** DELETE /api/v1/history — Clear hand history */
export async function DELETE() {
  clearHandHistory();
  return NextResponse.json({ cleared: true });
}
