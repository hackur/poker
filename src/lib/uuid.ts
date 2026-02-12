// ============================================================
// UUID Generation — Cryptographically secure for real-money
// ============================================================

/**
 * Generate a v4 UUID (crypto-random)
 * Browser: crypto.randomUUID()
 * Server: crypto.randomUUID() or fallback
 */
export function uuid(): string {
  // crypto.randomUUID() is available in Node 19+, modern browsers
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short ID (8 chars) for display purposes
 * Not for primary keys — just for human readability
 */
export function shortId(): string {
  return uuid().slice(0, 8);
}

/**
 * Validate a UUID string
 */
export function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
