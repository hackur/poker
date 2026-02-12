export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createUser, createSession, sessionCookieOptions, publicUser, type User } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, username, displayName, password } = body;

  const result = createUser(email, username, displayName, password);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const user = result as User;
  const session = createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(session.id));

  return NextResponse.json({ user: publicUser(user) }, { status: 201 });
}
