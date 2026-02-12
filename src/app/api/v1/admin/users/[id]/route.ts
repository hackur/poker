export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserById, updateUser, publicUser } from '@/lib/auth';

/** PATCH /api/v1/admin/users/[id] — Update user role or balance */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const target = getUserById(id);
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // Role changes: only superadmin can promote/demote
  if (body.role !== undefined) {
    if (currentUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmins can change roles' }, { status: 403 });
    }
    if (!['player', 'admin', 'superadmin'].includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    updates.role = body.role;
  }

  // Balance adjustment
  if (body.balance !== undefined) {
    const bal = Number(body.balance);
    if (isNaN(bal) || bal < 0) {
      return NextResponse.json({ error: 'Invalid balance' }, { status: 400 });
    }
    updates.balance = bal;
  }

  // Display name
  if (body.displayName !== undefined) {
    updates.displayName = String(body.displayName);
  }

  const updated = updateUser(id, updates as Parameters<typeof updateUser>[1]);
  if (!updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ user: publicUser(updated) });
}
