'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Crown, HandHelping, Hourglass, Sparkles } from 'lucide-react';
import { getTeamPalette } from '@jackaroo/game-config';
import type { GameSnapshot } from '@jackaroo/game-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, initials } from '@/lib/utils';

export function TurnBar({ snapshot, youId }: { snapshot: GameSnapshot; youId: string | null }) {
  const current = snapshot.currentPlayerId
    ? snapshot.players.find((player) => player.id === snapshot.currentPlayerId)
    : undefined;
  const palette = current ? getTeamPalette(current.teamId) : getTeamPalette(0);
  const isYou = Boolean(current && current.id === youId);
  const teammate = current
    ? snapshot.players.find((player) => player.teamId === current.teamId && player.id !== current.id)
    : undefined;
  const helping = Boolean(current?.finished && teammate && !teammate.finished);
  const inSeven = snapshot.phase === 'seven';
  const key = `${snapshot.currentPlayerId}-${snapshot.phase}-${snapshot.round}`;

  return (
    <div
      className={cn(
        'relative flex min-h-[3.1rem] items-center justify-between overflow-hidden rounded-xl border px-3 py-2 transition-colors sm:px-4',
        isYou ? 'border-gold/30 bg-gold/[0.06]' : 'border-white/8 bg-white/[0.025]',
      )}
    >
      {isYou ? (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-36 bg-[linear-gradient(90deg,rgba(216,179,106,0.09),transparent)]" />
      ) : null}
      <div className="relative z-10 flex min-w-0 items-center gap-2.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.25 }}
            className="flex min-w-0 items-center gap-2.5"
          >
            {current ? (
              <Avatar className="size-8 shrink-0 border" style={{ borderColor: `${palette.primary}55` }}>
                <AvatarFallback
                  className="text-[0.55rem] font-bold"
                  style={{ backgroundColor: palette.deep, color: palette.pale }}
                >
                  {initials(current.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full border border-white/10 text-cream/30">
                <Hourglass className="size-3.5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-xs font-semibold tracking-tight sm:text-sm">
                {isYou ? (
                  <span className="text-gold">Your turn</span>
                ) : (
                  <span className="text-cream/80">{current ? `${current.name}'s turn` : 'The table is waiting'}</span>
                )}
                {helping ? (
                  <span className="hidden items-center gap-1 text-[0.58rem] font-medium uppercase tracking-[0.1em] text-gold/70 sm:flex">
                    <HandHelping className="size-3" /> helping {teammate?.name.split(' ')[0]}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 truncate text-[0.6rem] text-cream/35">
                {inSeven ? (
                  <span className="flex items-center gap-1.5 text-gold/80">
                    <Sparkles className="size-2.5" />
                    Splitting seven · {snapshot.seven?.remaining ?? 0} steps left
                  </span>
                ) : isYou ? (
                  'Pick a card, then a highlighted marble.'
                ) : (
                  'Watching the table. Your hand stays private.'
                )}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2">
        {current?.finished ? (
          <span className="hidden items-center gap-1 rounded-full border border-gold/20 bg-gold/5 px-2 py-1 text-[0.5rem] uppercase tracking-[0.12em] text-gold sm:flex">
            <Crown className="size-2.5" /> Home
          </span>
        ) : null}
        <span className="hidden font-display text-xs text-cream/30 sm:block">Round {snapshot.round}</span>
        <span className="flex items-center gap-1.5 rounded-full border border-white/8 bg-black/20 px-2.5 py-1">
          <span
            className="size-1.5 rounded-full"
            style={{
              backgroundColor: palette.primary,
              boxShadow: isYou ? `0 0 8px ${palette.glow}` : undefined,
            }}
          />
          <span className="text-[0.52rem] font-semibold uppercase tracking-[0.12em] text-cream/40">
            {palette.shortName}
          </span>
        </span>
      </div>
    </div>
  );
}
