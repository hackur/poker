export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getCurrentUser, getOrCreateGuestUser, publicUser } from '@/lib/auth-kv';

export async function GET() {
  let user = await getCurrentUser();
  if (user) {
    return NextResponse.json({ user: publicUser(user) });
  }
  
  // Auto-create guest user for seamless play
  try {
    user = await getOrCreateGuestUser();
    if (user) {
      return NextResponse.json({ user: publicUser(user) });
    }
  } catch (err) {
    console.error('[auth/session] Guest creation failed:', err);
  }
  
  return NextResponse.json({ user: null }, { status: 401 });
}
