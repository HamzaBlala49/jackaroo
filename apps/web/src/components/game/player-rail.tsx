'use client';

import { getTeamPalette } from '@jackaroo/game-config';
import type { GameSnapshot } from '@jackaroo/game-types';
import { Crown, Layers2, WifiOff } from 'lucide-react';
import { cn, initials } from '@/lib/utils';

export function PlayerRail({ snapshot, youId }: { snapshot: GameSnapshot; youId: string | null }) {
  const players = [...snapshot.players].sort((a, b) => a.seat - b.seat);
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2 sm:px-5">
      {players.map((player) => {
        const palette = getTeamPalette(player.teamId);
        const current = snapshot.currentPlayerId === player.id;
        const isYou = player.id === youId;
        const connected = snapshot.presence[player.id] ?? false;
        return (
          <div
            key={player.id}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-1.5 py-1 pr-2.5 transition-colors',
              current ? 'border-gold/25 bg-gold/[0.06]' : 'border-white/8 bg-white/[0.02]',
            )}
            style={current ? { boxShadow: `0 0 18px -6px ${palette.glow}` } : undefined}
          >
            <span
              className="relative flex size-6 items-center justify-center rounded-full text-[0.48rem] font-bold"
              style={{ backgroundColor: palette.deep, color: palette.pale, border: `1px solid ${palette.primary}55` }}
            >
              {initials(player.name)}
              {!connected ? (
                <span className="absolute -bottom-0.5 -right-0.5 grid size-3 place-items-center rounded-full border border-[#04120f] bg-[#2a2a28]">
                  <WifiOff className="size-1.5 text-cream/50" />
                </span>
              ) : null}
            </span>
            <span className="max-w-20 truncate text-[0.6rem] font-medium text-cream/60">
              {player.name.split(' ')[0]}
              {isYou ? <span className="text-gold"> · you</span> : null}
            </span>
            <span className="flex items-center gap-0.5 text-[0.5rem] text-cream/30">
              <Layers2 className="size-2.5" />
              {player.handCount}
            </span>
            {player.finished ? <Crown className="size-2.5 text-gold" /> : null}
          </div>
        );
      })}
    </div>
  );
}
