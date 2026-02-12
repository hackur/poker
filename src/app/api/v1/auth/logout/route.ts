export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('poker_session')?.value;
  if (sessionId) {
    deleteSession(sessionId);
    cookieStore.delete('poker_session');
  }
  return NextResponse.json({ ok: true });
}
