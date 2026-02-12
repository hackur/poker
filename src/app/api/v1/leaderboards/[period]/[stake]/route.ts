import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, type Period, type StakeLevel } from '@/lib/leaderboard-store';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ period: string; stake: string }> }
) {
  const { period, stake } = await params;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  const result = getLeaderboard({
    period: period as Period,
    stake: stake as StakeLevel,
    limit,
    offset,
  });
  return NextResponse.json(result);
}
