'use client';

import { motion } from 'motion/react';
import { Check, Crown, Plus, UserRound, WifiOff } from 'lucide-react';
import type { RoomSeatView } from '@jackaroo/game-types';
import type { TeamPalette } from '@jackaroo/game-config';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, initials } from '@/lib/utils';

export function SeatCard({
  seat,
  team,
  isYou,
  isHost,
}: {
  seat: RoomSeatView;
  team: TeamPalette;
  isYou: boolean;
  isHost: boolean;
}) {
  const player = seat.player;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative min-h-[6.6rem] overflow-hidden rounded-2xl border p-3.5 transition-colors',
        player
          ? 'border-white/10 bg-[#071914]/80'
          : 'border-dashed border-white/12 bg-black/10',
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${team.primary}, transparent)` }}
      />
      {player ? (
        <div className="relative z-10 flex items-start gap-3">
          <div className="relative">
            <Avatar
              className="size-11 border"
              style={{ borderColor: `${team.primary}66`, backgroundColor: team.deep }}
            >
              <AvatarFallback
                className="text-[0.7rem] font-bold"
                style={{ backgroundColor: team.deep, color: team.pale }}
              >
                {initials(player.displayName)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#071914]',
                player.connected ? 'bg-emerald-400' : 'bg-stone-500',
              )}
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold tracking-tight text-cream/90">
                {player.displayName}
              </p>
              {player.isHost ? <Crown className="size-3 shrink-0 text-gold" /> : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {isYou ? (
                <Badge className="border-gold/25 bg-gold/10 px-1.5 py-0 text-[0.5rem] text-gold">You</Badge>
              ) : null}
              <Badge
                variant="felt"
                className={cn(
                  'border-white/10 px-1.5 py-0 text-[0.5rem]',
                  player.ready ? 'text-emerald-300' : 'text-cream/40',
                )}
              >
                {player.ready ? (
                  <>
                    <Check className="size-2.5" /> Ready
                  </>
                ) : (
                  'Not ready'
                )}
              </Badge>
              {!player.connected ? (
                <Badge variant="felt" className="border-white/10 px-1.5 py-0 text-[0.5rem] text-rose-300">
                  <WifiOff className="size-2.5" /> Offline
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex min-h-[4.6rem] flex-col items-center justify-center gap-1.5 text-center">
          <span
            className="flex size-9 items-center justify-center rounded-full border border-dashed"
            style={{ borderColor: `${team.primary}44`, color: team.primary, background: `${team.primary}0d` }}
          >
            <Plus className="size-4" />
          </span>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-cream/35">
            Open seat {seat.seat + 1}
          </p>
          <p className="text-[0.58rem] text-cream/25">Share the code to fill it</p>
        </div>
      )}
      {player && !player.ready ? (
        <span className="absolute bottom-2 right-2 text-[0.5rem] uppercase tracking-[0.14em] text-cream/20">
          waiting
        </span>
      ) : null}
      {isHost && player && !player.ready ? null : null}
      <UserRound className="pointer-events-none absolute -bottom-4 -right-3 size-16 text-white/[0.025]" />
    </motion.div>
  );
}
