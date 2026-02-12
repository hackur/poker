export const runtime = 'edge';

import { NextResponse } from 'next/server';

/** GET /api/v1 — API version and health check */
export async function GET() {
  return NextResponse.json({
    api: 'poker',
    version: '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
