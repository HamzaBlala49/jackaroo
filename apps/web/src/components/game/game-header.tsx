'use client';

import * as React from 'react';
import { BookOpen, Copy, PanelRight, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import type { GameSnapshot } from '@jackaroo/game-types';
import { Logo, LogoMark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { SoundToggle } from '@/components/sound-toggle';
import { RulesDialog } from '@/components/rules/rules-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSocketStatus } from '@/lib/socket-provider';
import { useElapsedSeconds } from '@/hooks/use-elapsed-seconds';
import { copyText, formatDuration } from '@/lib/utils';

export function GameHeader({
  snapshot,
  onOpenTable,
}: {
  snapshot: GameSnapshot;
  onOpenTable: () => void;
}) {
  const status = useSocketStatus();
  const elapsed = useElapsedSeconds(snapshot.startedAt);
  const presence = Object.values(snapshot.presence).filter(Boolean).length;
  const [copied, setCopied] = React.useState(false);

  const copyCode = async () => {
    try {
      await copyText(snapshot.code);
      setCopied(true);
      toast.success('Room code copied.');
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error('Could not copy the room code.');
    }
  };

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-white/8 bg-[#04120f]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[100rem] items-center justify-between gap-2 px-3 sm:h-16 sm:px-5 lg:px-7">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="hidden sm:block">
            <Logo compact showTagline={false} />
          </div>
          <div className="sm:hidden">
            <LogoMark size={31} />
          </div>
          <span className="hidden h-6 w-px bg-white/10 sm:block" />
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy room code"
            className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1.5 transition hover:border-gold/30 sm:px-2.5"
          >
            <span className="font-mono text-[0.58rem] tracking-[0.12em] text-gold/85 sm:text-[0.65rem] sm:tracking-[0.18em]">{snapshot.code}</span>
            <Copy className="size-3 text-cream/25 transition group-hover:text-gold" />
          </button>
          {copied ? <span className="hidden text-[0.55rem] text-emerald-300 sm:inline">Copied</span> : null}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2 rounded-full border border-white/8 bg-black/15 px-3 py-1.5 text-[0.52rem] font-semibold uppercase tracking-[0.14em] text-cream/35">
            <span>Round {snapshot.round}</span>
            <span className="size-1 rotate-45 border border-gold/30" />
            <span>{formatDuration(elapsed)}</span>
            <span className="size-1 rotate-45 border border-gold/30" />
            <span className="flex items-center gap-1">
              <UsersRound className="size-2.5" />
              {presence}/{snapshot.players.length}
            </span>
          </div>
          <Badge
            variant="felt"
            className="gap-1.5 border-white/8 px-2 py-1 text-[0.5rem] text-cream/40"
          >
            <span
              className={`size-1.5 rounded-full ${
                status === 'connected'
                  ? 'bg-emerald-400'
                  : status === 'reconnecting'
                    ? 'animate-pulse bg-amber-400'
                    : 'bg-rose-400'
              }`}
            />
            {status === 'connected' ? 'Live' : status === 'reconnecting' ? 'Reconnecting' : 'Offline'}
          </Badge>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-cream/55 hover:bg-white/5 hover:text-cream lg:hidden"
            onClick={onOpenTable}
            aria-label="Open the table panel"
          >
            <PanelRight />
          </Button>
          <RulesDialog
            rules={snapshot.rules}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-cream/55 hover:bg-white/5 hover:text-cream"
                aria-label="Open the rulebook"
              >
                <BookOpen />
              </Button>
            }
          />
          <SoundToggle className="text-cream/55 hover:bg-white/5 hover:text-cream" />
          <ThemeToggle className="text-cream/55 hover:bg-white/5 hover:text-cream" />
        </div>
      </div>
    </header>
  );
}
