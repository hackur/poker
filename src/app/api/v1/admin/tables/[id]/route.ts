export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-kv';
import { deleteTable, getTable, leaveTable } from '@/lib/table-store-kv';
import { getGameManagerV2 } from '@/lib/game-manager-v2';

/** DELETE /api/v1/admin/tables/[id] — Close/delete a table */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const table = await getTable(id);
  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  // Remove from game manager
  const gm = getGameManagerV2();
  gm.resetGame(id, '');

  // Delete from table store
  await deleteTable(id);

  return NextResponse.json({ success: true, message: `Table ${id} deleted` });
}

/** POST /api/v1/admin/tables/[id] — Kick player from table */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, playerId } = body;

  if (action === 'kick' && playerId) {
    const table = await getTable(id);
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const result = await leaveTable(id, playerId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Player ${playerId} kicked from table ${id}` });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
