// ============================================================
// Auth Middleware — Protect routes requiring authentication
// ============================================================

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/table',
  '/profile',
  '/api/v1/table',
  '/api/v1/table-v2',
];

// Routes that require admin role
const ADMIN_ROUTES = [
  '/admin',
  '/api/v1/admin',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Check if route requires auth
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdmin = ADMIN_ROUTES.some(route => pathname.startsWith(route));

  // Redirect unauthenticated users to login
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin access
  if (isAdmin) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
});

// Matcher configuration
export const config = {
  matcher: [
    // Match all routes except static files and api/auth
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
