export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyLogin, createSession, sessionCookieOptions, publicUser } from '@/lib/auth-kv';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const user = await verifyLogin(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const session = await createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(session.id));

  return NextResponse.json({ user: publicUser(user) });
}
