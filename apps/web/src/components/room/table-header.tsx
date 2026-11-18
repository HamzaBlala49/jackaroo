'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, Copy, DoorOpen, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicRules, RoomView } from '@jackaroo/game-types';
import { Logo, LogoMark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { SoundToggle } from '@/components/sound-toggle';
import { RulesDialog } from '@/components/rules/rules-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSocketStatus } from '@/lib/socket-provider';
import { copyText } from '@/lib/utils';

export function TableHeader({
  room,
  rules,
  onLeave,
  leaving,
}: {
  room: RoomView;
  rules?: PublicRules;
  onLeave?: () => void;
  leaving?: boolean;
}) {
  const status = useSocketStatus();
  const [copied, setCopied] = React.useState(false);

  const copyCode = async () => {
    try {
      await copyText(room.code);
      setCopied(true);
      toast.success('Room code copied.');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy the code.');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#04120f]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <Logo compact />
          </div>
          <div className="sm:hidden">
            <LogoMark size={31} />
          </div>
          <div className="hidden h-7 w-px bg-white/10 sm:block" />
          <button
            type="button"
            onClick={copyCode}
            className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 transition hover:border-gold/30 sm:gap-2 sm:px-3"
            aria-label="Copy room code"
          >
            <span className="hidden text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-cream/40 sm:inline">
              Room
            </span>
            <span className="font-mono text-[0.68rem] tracking-[0.18em] text-gold sm:text-xs sm:tracking-[0.22em]">{room.code}</span>
            <Copy className="size-3 text-cream/30 transition group-hover:text-gold" />
          </button>
          {copied ? <span className="hidden text-[0.6rem] text-emerald-300 sm:inline">Copied</span> : null}
        </div>

        <div className="flex items-center gap-0.5">
          <Badge
            variant="felt"
            className="mr-1 hidden border-white/10 text-cream/50 sm:inline-flex"
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
          <RulesDialog
            rules={rules}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="text-cream/60 hover:bg-white/8 hover:text-cream"
                aria-label="Open the rulebook"
              >
                <BookOpen />
              </Button>
            }
          />
          <SoundToggle className="text-cream/60 hover:bg-white/8 hover:text-cream" />
          <ThemeToggle className="text-cream/60 hover:bg-white/8 hover:text-cream" />
          {onLeave ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-cream/60 hover:bg-white/8 hover:text-cream"
              onClick={onLeave}
              disabled={leaving}
              aria-label="Leave room"
            >
              <LogOut />
            </Button>
          ) : (
            <Button asChild variant="ghost" size="icon" className="text-cream/60 hover:bg-white/8 hover:text-cream">
              <Link href="/play" aria-label="Return to lobby">
                <DoorOpen />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
