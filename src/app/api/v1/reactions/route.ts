export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { addReaction, removeReaction } from '@/lib/chat-manager';

// POST /api/v1/reactions { tableId, messageId, emoji, playerId }
export async function POST(req: NextRequest) {
  try {
    const { tableId, messageId, emoji, playerId } = await req.json();
    if (!tableId || !messageId || !emoji || !playerId) {
      return NextResponse.json({ error: 'tableId, messageId, emoji, playerId required' }, { status: 400 });
    }
    const ok = addReaction(tableId, messageId, emoji, playerId);
    return NextResponse.json({ success: ok }, { status: ok ? 200 : 404 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

// DELETE /api/v1/reactions { tableId, messageId, emoji, playerId }
export async function DELETE(req: NextRequest) {
  try {
    const { tableId, messageId, emoji, playerId } = await req.json();
    if (!tableId || !messageId || !emoji || !playerId) {
      return NextResponse.json({ error: 'tableId, messageId, emoji, playerId required' }, { status: 400 });
    }
    const ok = removeReaction(tableId, messageId, emoji, playerId);
    return NextResponse.json({ success: ok }, { status: ok ? 200 : 404 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
