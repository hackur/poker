export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getFriendsWithStatus, addFriend, removeFriend, getOrCreateProfile } from '@/lib/chat-manager';

// GET /api/v1/players/[id]/friends
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const friends = getFriendsWithStatus(id);
  return NextResponse.json({ friends });
}

// POST /api/v1/players/[id]/friends { friendId, friendName }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { friendId, friendName } = await req.json();
    if (!friendId || !friendName) {
      return NextResponse.json({ error: 'friendId, friendName required' }, { status: 400 });
    }
    // Ensure both profiles exist
    getOrCreateProfile(id, id);
    getOrCreateProfile(friendId, friendName);
    const ok = addFriend(id, friendId, friendName);
    return NextResponse.json({ success: ok }, { status: ok ? 201 : 409 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

// DELETE /api/v1/players/[id]/friends { friendId }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { friendId } = await req.json();
    if (!friendId) {
      return NextResponse.json({ error: 'friendId required' }, { status: 400 });
    }
    const ok = removeFriend(id, friendId);
    return NextResponse.json({ success: ok }, { status: ok ? 200 : 404 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
