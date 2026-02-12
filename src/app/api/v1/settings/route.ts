import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/game-config';

/** GET /api/v1/settings — Get current game settings */
export async function GET() {
  return NextResponse.json(getSettings());
}

/** POST /api/v1/settings — Update game settings (partial) */
export async function POST(request: NextRequest) {
  const patch = await request.json();
  const updated = updateSettings(patch);
  return NextResponse.json(updated);
}
