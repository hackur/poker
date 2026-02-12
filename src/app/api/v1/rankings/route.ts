import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, type Period } from '@/lib/leaderboard-store';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const period = (url.searchParams.get('period') ?? 'all-time') as Period;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  const result = getLeaderboard({ period, limit, offset });
  return NextResponse.json(result);
}
