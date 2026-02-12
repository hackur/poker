// ============================================================
// Shared UI Constants — Single source of truth
// ============================================================

// Card sizes used across components
export const CARD_SIZES = {
  sm: { width: 'w-10', height: 'h-14', rank: 'text-xs', suit: 'text-sm' },
  md: { width: 'w-14', height: 'h-20', rank: 'text-sm', suit: 'text-lg' },
  lg: { width: 'w-20', height: 'h-28', rank: 'text-lg', suit: 'text-2xl' },
} as const;

export type CardSize = keyof typeof CARD_SIZES;

// Chip sizes
export const CHIP_SIZES = {
  sm: { chip: 'w-6 h-6', text: 'text-[8px]', stack: 2 },
  md: { chip: 'w-8 h-8', text: 'text-[10px]', stack: 3 },
  lg: { chip: 'w-10 h-10', text: 'text-xs', stack: 4 },
} as const;

export type ChipSize = keyof typeof CHIP_SIZES;

// Chip colors by denomination
export const CHIP_COLORS = [
  { min: 0, max: 25, bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' },
  { min: 25, max: 100, bg: 'bg-red-500', border: 'border-red-700', text: 'text-white' },
  { min: 100, max: 500, bg: 'bg-green-500', border: 'border-green-700', text: 'text-white' },
  { min: 500, max: 1000, bg: 'bg-blue-500', border: 'border-blue-700', text: 'text-white' },
  { min: 1000, max: Infinity, bg: 'bg-yellow-400', border: 'border-yellow-600', text: 'text-black' },
] as const;

export function getChipColor(amount: number) {
  return CHIP_COLORS.find((c) => amount >= c.min && amount < c.max) ?? CHIP_COLORS[0];
}

// Format chip amounts (K, M)
export function formatChipAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return amount.toString();
}

// Standard animation configs
export const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 } as const;
export const SPRING_BOUNCY = { type: 'spring', stiffness: 300, damping: 20 } as const;
