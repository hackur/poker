export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getMessages, addMessage } from '@/lib/chat-manager';

// GET /api/v1/chat/messages?tableId=xxx&since=timestamp
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tableId = searchParams.get('tableId');
  if (!tableId) return NextResponse.json({ error: 'tableId required' }, { status: 400 });

  const since = searchParams.get('since');
  const messages = getMessages(tableId, since ? Number(since) : undefined);
  return NextResponse.json({ messages, timestamp: Date.now() });
}

// POST /api/v1/chat/messages { tableId, playerId, playerName, content }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableId, playerId, playerName, content } = body;
    if (!tableId || !playerId || !playerName || !content) {
      return NextResponse.json({ error: 'tableId, playerId, playerName, content required' }, { status: 400 });
    }
    if (typeof content !== 'string' || content.length > 500) {
      return NextResponse.json({ error: 'content must be string ≤500 chars' }, { status: 400 });
    }
    const message = addMessage(tableId, playerId, playerName, content.trim());
    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
