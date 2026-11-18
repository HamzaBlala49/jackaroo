'use client';

import * as React from 'react';
import {
  ArrowLeftRight,
  CardSim,
  Check,
  Crown,
  Flag,
  Home,
  Layers2,
  LogOut,
  MoveRight,
  Sparkles,
  Swords,
  Trophy,
  WifiOff,
} from 'lucide-react';
import { getTeamPalette } from '@jackaroo/game-config';
import type { GameLogEntry, GameSnapshot } from '@jackaroo/game-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, initials } from '@/lib/utils';

export function MatchPanel({
  snapshot,
  className,
  compact = false,
}: {
  snapshot: GameSnapshot;
  className?: string;
  compact?: boolean;
}) {
  const logRef = React.useRef<HTMLDivElement>(null);
  const players = [...snapshot.players].sort((a, b) => a.seat - b.seat);
  const youId = snapshot.you?.playerId ?? null;

  React.useEffect(() => {
    const element = logRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [snapshot.log.length]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="border-b border-white/8 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-gold">
              The table
            </p>
            <p className="mt-1 font-display text-xl text-cream">Round {snapshot.round}</p>
          </div>
          <Badge variant="felt" className="border-white/10 text-cream/40">
            Turn {snapshot.turnNumber}
          </Badge>
        </div>

        <div className="mt-4 space-y-2">
          {snapshot.teams.map((team) => {
            const palette = getTeamPalette(team.id);
            const teamPlayers = players.filter((player) => player.teamId === team.id);
            const isCurrent = teamPlayers.some((player) => player.id === snapshot.currentPlayerId);
            return (
              <div
                key={team.id}
                className={cn(
                  'rounded-xl border px-3 py-2 transition-colors',
                  isCurrent ? 'border-white/15 bg-white/[0.045]' : 'border-white/[0.06] bg-white/[0.015]',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: palette.primary, boxShadow: `0 0 8px ${palette.glow}` }}
                    />
                    <span className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-cream/60">
                      {palette.shortName}
                    </span>
                    {isCurrent ? (
                      <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[0.45rem] uppercase tracking-[0.14em] text-cream/40">
                        turn
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 font-display text-sm text-cream/50">
                    {team.marblesHome}/8
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1">
                    {Array.from({ length: 8 }, (_, index) => (
                      <span
                        key={index}
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            index < team.marblesHome ? palette.primary : 'rgba(255,255,255,0.08)',
                          boxShadow:
                            index < team.marblesHome ? `0 0 5px ${palette.glow}` : undefined,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[0.52rem] uppercase tracking-[0.12em] text-cream/20">
                    {teamPlayers.map((player) => player.name.split(' ')[0]).join(' · ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-b border-white/8 px-3 py-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-[0.52rem] font-semibold uppercase tracking-[0.2em] text-cream/30">
            Players
          </p>
          <p className="text-[0.52rem] uppercase tracking-[0.16em] text-cream/20">
            {players.filter((player) => snapshot.presence[player.id]).length}/{players.length} live
          </p>
        </div>
        <div className="space-y-1">
          {players.map((player) => {
            const palette = getTeamPalette(player.teamId);
            const current = snapshot.currentPlayerId === player.id;
            const isYou = player.id === youId;
            const connected = snapshot.presence[player.id] ?? false;
            return (
              <div
                key={player.id}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
                  current ? 'bg-white/[0.055]' : 'hover:bg-white/[0.025]',
                )}
              >
                <div className="relative">
                  <Avatar
                    className="size-7 border"
                    style={{ borderColor: current ? palette.primary : 'rgba(255,255,255,0.08)' }}
                  >
                    <AvatarFallback
                      className="text-[0.5rem] font-bold"
                      style={{ backgroundColor: palette.deep, color: palette.pale }}
                    >
                      {initials(player.name)}
                    </AvatarFallback>
                  </Avatar>
                  {current ? (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#051713]"
                      style={{ backgroundColor: palette.primary }}
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span
                    className={cn(
                      'truncate text-[0.7rem]',
                      current ? 'font-semibold text-cream/90' : 'text-cream/60',
                    )}
                  >
                    {player.name}
                  </span>
                  {isYou ? <span className="text-[0.48rem] font-bold uppercase tracking-[0.1em] text-gold">you</span> : null}
                  {player.finished ? <Crown className="size-2.5 shrink-0 text-gold" /> : null}
                  {!connected ? <WifiOff className="size-2.5 shrink-0 text-rose-300/70" /> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1 text-[0.55rem] text-cream/30">
                  <Layers2 className="size-2.5" />
                  {player.handCount}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  {Array.from({ length: 4 }, (_, index) => (
                    <span
                      key={index}
                      className="size-1 rounded-full"
                      style={{
                        backgroundColor:
                          index < player.stats.marblesHome ? palette.primary : 'rgba(255,255,255,0.07)',
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <p className="text-[0.52rem] font-semibold uppercase tracking-[0.2em] text-cream/30">
            Table log
          </p>
          <div className="flex items-center gap-2 text-[0.5rem] uppercase tracking-[0.14em] text-cream/20">
            <span className="flex items-center gap-1">
              <Layers2 className="size-2.5" /> {snapshot.deckCount}
            </span>
            <span className="flex items-center gap-1">
              <LogOut className="size-2.5" /> {snapshot.discardCount}
            </span>
          </div>
        </div>
        <div
          ref={logRef}
          className={cn(
            'min-h-[8rem] flex-1 space-y-0.5 overflow-y-auto px-3 pb-3 scrollbar-thin',
            compact && 'min-h-[12rem]',
          )}
        >
          {snapshot.log.length === 0 ? (
            <p className="px-2 py-6 text-center text-[0.65rem] text-cream/25">
              The table is quiet. The first card is waiting.
            </p>
          ) : (
            snapshot.log.slice(-60).map((entry) => (
              <LogRow key={entry.seq} entry={entry} snapshot={snapshot} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LogRow({ entry, snapshot }: { entry: GameLogEntry; snapshot: GameSnapshot }) {
  const player = snapshot.players.find((candidate) => candidate.id === entry.playerId);
  const palette = player ? getTeamPalette(player.teamId) : null;
  const icon = iconForLog(entry);
  const highlight =
    entry.kind === 'marble-captured' ||
    entry.kind === 'game-finished' ||
    entry.kind === 'player-finished';

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg px-2 py-1.5 text-[0.66rem] leading-relaxed',
        highlight ? 'bg-gold/[0.045] text-cream/70' : 'text-cream/45',
      )}
    >
      <span
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.02] [&_svg]:size-2.5"
        style={palette ? { color: palette.primary, borderColor: `${palette.primary}33` } : undefined}
      >
        {icon}
      </span>
      <p className="min-w-0 flex-1">
        {entry.text}
        {entry.round ? (
          <span className="ml-1 text-[0.52rem] uppercase tracking-[0.12em] text-cream/15">
            R{entry.round}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function iconForLog(entry: GameLogEntry) {
  switch (entry.kind) {
    case 'card-played':
      return <CardSim />;
    case 'card-discarded':
      return <LogOut />;
    case 'marble-captured':
      return <Swords />;
    case 'marble-home':
      return <Home />;
    case 'marble-entered':
      return <MoveRight />;
    case 'marble-moved':
      return <MoveRight />;
    case 'swap':
      return <ArrowLeftRight />;
    case 'player-finished':
      return <Crown />;
    case 'game-finished':
      return <Trophy />;
    case 'round-ended':
      return <Flag />;
    case 'seven-progress':
      return <Sparkles />;
    case 'turn-started':
      return <Check />;
    case 'game-started':
      return <Sparkles />;
    default:
      return <Layers2 />;
  }
}
