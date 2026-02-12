'use client';

import { BADGE_DEFS } from '@/lib/elo-system';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

export function BadgeDisplay({ badges }: { badges: Badge[] }) {
  const unlockedIds = new Set(badges.map(b => b.id));

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
      {BADGE_DEFS.map(def => {
        const unlocked = unlockedIds.has(def.id);
        const badge = badges.find(b => b.id === def.id);
        return (
          <div
            key={def.id}
            className={`relative rounded-xl p-3 text-center border transition-all ${
              unlocked
                ? 'bg-[#252525] border-[#14b8a6]/50 shadow-lg shadow-[#14b8a6]/10'
                : 'bg-[#1a1a1a] border-[#333] opacity-40 grayscale'
            }`}
            title={unlocked ? `${def.name} — Unlocked ${new Date(badge!.unlockedAt).toLocaleDateString()}` : def.description}
          >
            <div className="text-3xl mb-1">{def.icon}</div>
            <div className="text-xs font-semibold text-white truncate">{def.name}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{def.description}</div>
            {unlocked && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#14b8a6] rounded-full flex items-center justify-center text-[8px]">✓</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function EloChart({ history, width = 700, height = 120 }: { history: { timestamp: number; rating: number }[]; width?: number; height?: number }) {
  if (history.length < 2) return <div className="text-gray-500 text-sm">Not enough data for ELO chart</div>;

  const ratings = history.map(h => h.rating);
  const min = Math.min(...ratings) - 20;
  const max = Math.max(...ratings) + 20;
  const range = max - min || 1;

  const points = history.map((h, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((h.rating - min) / range) * (height - 16) - 8;
    return `${x},${y}`;
  }).join(' ');

  const lastRating = ratings[ratings.length - 1];
  const firstRating = ratings[0];
  const color = lastRating >= firstRating ? '#14b8a6' : '#ef4444';

  // 1200 baseline
  const baselineY = height - ((1200 - min) / range) * (height - 16) - 8;

  return (
    <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Baseline */}
      {min < 1200 && max > 1200 && (
        <line x1={0} x2={width} y1={baselineY} y2={baselineY} stroke="#555" strokeWidth="1" strokeDasharray="4,4" />
      )}
      {/* Area fill */}
      <polygon
        fill={`${color}15`}
        points={`0,${height} ${points} ${width},${height}`}
      />
      {/* Line */}
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      {/* Current rating label */}
      <text x={width - 4} y={12} textAnchor="end" fill={color} fontSize="12" fontWeight="bold">
        {lastRating}
      </text>
    </svg>
  );
}
