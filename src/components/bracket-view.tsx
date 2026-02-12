'use client';

/**
 * Phase 12: Bracket Visualization Component
 * Renders single/double elimination brackets and round robin standings
 */

import { type Bracket, type BracketMatch } from '@/lib/bracket-generator';

interface BracketViewProps {
  bracket: Bracket;
  playerNames?: Record<string, string>;
}

function MatchCard({ match, playerNames }: { match: BracketMatch; playerNames?: Record<string, string> }) {
  const getName = (id: string | null) => {
    if (!id) return 'TBD';
    return playerNames?.[id] ?? id.slice(0, 8);
  };

  const statusColor = {
    pending: 'border-gray-600',
    active: 'border-yellow-500',
    complete: 'border-green-600',
  }[match.status];

  return (
    <div className={`border-2 ${statusColor} rounded-lg p-2 bg-gray-800 min-w-[160px] text-sm`}>
      <div
        className={`flex justify-between items-center p-1 rounded ${
          match.winnerId === match.player1Id ? 'bg-green-900/50 font-bold' : ''
        }`}
      >
        <span className="text-white">{getName(match.player1Id)}</span>
        {match.winnerId === match.player1Id && <span className="text-green-400">✓</span>}
      </div>
      <div className="border-t border-gray-700 my-1" />
      <div
        className={`flex justify-between items-center p-1 rounded ${
          match.winnerId === match.player2Id ? 'bg-green-900/50 font-bold' : ''
        }`}
      >
        <span className="text-white">{getName(match.player2Id)}</span>
        {match.winnerId === match.player2Id && <span className="text-green-400">✓</span>}
      </div>
    </div>
  );
}

function EliminationBracket({ rounds, playerNames, label }: {
  rounds: BracketMatch[][];
  playerNames?: Record<string, string>;
  label?: string;
}) {
  return (
    <div>
      {label && <h3 className="text-lg font-bold text-white mb-4">{label}</h3>}
      <div className="flex gap-8 overflow-x-auto pb-4">
        {rounds.map((round, ri) => (
          <div key={ri} className="flex flex-col gap-4 justify-center">
            <div className="text-center text-gray-400 text-xs font-semibold mb-2">
              Round {ri + 1}
            </div>
            {round.map((match) => (
              <MatchCard key={match.matchId} match={match} playerNames={playerNames} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoundRobinView({ rounds, playerNames }: {
  rounds: BracketMatch[][];
  playerNames?: Record<string, string>;
}) {
  // Collect all players and their win/loss records
  const records = new Map<string, { wins: number; losses: number; played: number }>();
  for (const round of rounds) {
    for (const match of round) {
      for (const pid of [match.player1Id, match.player2Id]) {
        if (pid && !records.has(pid)) records.set(pid, { wins: 0, losses: 0, played: 0 });
      }
      if (match.status === 'complete' && match.winnerId) {
        const w = records.get(match.winnerId);
        if (w) { w.wins++; w.played++; }
        if (match.loserId) {
          const l = records.get(match.loserId);
          if (l) { l.losses++; l.played++; }
        }
      }
    }
  }

  const sorted = [...records.entries()].sort((a, b) => b[1].wins - a[1].wins);
  const getName = (id: string) => playerNames?.[id] ?? id.slice(0, 8);

  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-4">Round Robin Standings</h3>
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-gray-800">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Player</th>
            <th className="px-4 py-2">W</th>
            <th className="px-4 py-2">L</th>
            <th className="px-4 py-2">Played</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([pid, rec], i) => (
            <tr key={pid} className="border-b border-gray-700">
              <td className="px-4 py-2">{i + 1}</td>
              <td className="px-4 py-2 font-medium text-white">{getName(pid)}</td>
              <td className="px-4 py-2 text-green-400">{rec.wins}</td>
              <td className="px-4 py-2 text-red-400">{rec.losses}</td>
              <td className="px-4 py-2">{rec.played}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="text-md font-bold text-white mt-6 mb-2">Schedule</h4>
      <div className="space-y-4">
        {rounds.map((round, ri) => (
          <div key={ri}>
            <div className="text-gray-400 text-xs font-semibold mb-1">Round {ri + 1}</div>
            <div className="flex flex-wrap gap-2">
              {round.map((match) => (
                <MatchCard key={match.matchId} match={match} playerNames={playerNames} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BracketView({ bracket, playerNames }: BracketViewProps) {
  if (bracket.type === 'round-robin') {
    return <RoundRobinView rounds={bracket.rounds} playerNames={playerNames} />;
  }

  return (
    <div className="space-y-8">
      <EliminationBracket
        rounds={bracket.rounds}
        playerNames={playerNames}
        label={bracket.type === 'double-elimination' ? 'Winners Bracket' : undefined}
      />
      {bracket.type === 'double-elimination' && bracket.losersRounds && (
        <EliminationBracket
          rounds={bracket.losersRounds}
          playerNames={playerNames}
          label="Losers Bracket"
        />
      )}
    </div>
  );
}
