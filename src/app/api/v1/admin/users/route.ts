import { NextResponse } from 'next/server';
import { getAllUsers, publicUser, getCurrentUser } from '@/lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const users = getAllUsers().map(publicUser);
  return NextResponse.json({ users });
}
