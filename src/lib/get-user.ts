// ============================================================
// Get Current User — Helper for API routes
// ============================================================

import { auth } from '@/auth';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
  balance: number;
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    balance: session.user.balance,
  };
}

/**
 * Get the current user or throw an error.
 * Use in protected API routes.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Check if the current user has a specific role.
 */
export async function hasRole(role: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  
  const roleHierarchy = ['player', 'vip', 'admin', 'superadmin'];
  const userLevel = roleHierarchy.indexOf(user.role);
  const requiredLevel = roleHierarchy.indexOf(role);
  
  return userLevel >= requiredLevel;
}
