export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getAllUsers, publicUser, getCurrentUser } from '@/lib/auth-kv';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users: users.map(publicUser) });
}
