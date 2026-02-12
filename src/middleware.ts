// ============================================================
// Auth Middleware — Protect routes requiring authentication
// ============================================================

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Routes that DON'T require auth (checked before protected)
const PUBLIC_API_ROUTES = [
  '/api/v1/tables',
  '/api/v1/table',       // Demo table access (remove for production)
  '/api/v1/games',       // WebSocket endpoint
  '/table/demo',         // Demo table page (guest access)
  '/table/heads-up-',    // Heads-up tables (guest access)
];

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/table',
  '/profile',
  '/api/v1/table-v2',  // Full game API requires auth
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

  // Skip auth for public API routes
  const isPublicApi = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
  if (isPublicApi) return NextResponse.next();

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
