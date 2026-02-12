export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { auth, getUserById } from '@/auth';

/** GET /api/auth/me — Get current user with full profile */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Get full user data from store
  const user = getUserById(session.user.id);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    balance: user.balance,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    providers: user.providers,
  });
}
