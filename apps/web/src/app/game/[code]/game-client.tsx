'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import { OnboardingGate } from '@/components/onboarding-gate';
import { Logo } from '@/components/brand/logo';
import { GameScreen } from '@/components/game/game-screen';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-provider';
import { useRoomSession } from '@/hooks/use-room-session';
import { useRoomStore } from '@/stores/room-store';
import { useGameStore } from '@/stores/game-store';

export function GameClient({ code }: { code: string }) {
  return (
    <OnboardingGate context="Match in progress">
      <GameContent code={code} />
    </OnboardingGate>
  );
}

function GameContent({ code }: { code: string }) {
  useRoomSession(code);
  const { user } = useAuth();
  const router = useRouter();
  const room = useRoomStore((state) => state.room);
  const roomMatchId = useRoomStore((state) => state.matchId);
  const loading = useRoomStore((state) => state.loading);
  const error = useRoomStore((state) => state.error);
  const snapshot = useGameStore((state) => state.snapshot);

  React.useEffect(() => {
    if (!room) return;
    if (room.status === 'waiting') {
      router.replace(`/room/${code}`);
    }
  }, [code, room, router]);

  React.useEffect(() => {
    if (room?.status === 'finished' && roomMatchId) {
      const timer = window.setTimeout(() => router.replace(`/results/${roomMatchId}`), 300);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [room?.status, roomMatchId, router]);

  React.useEffect(() => {
    if (snapshot?.status === 'finished') {
      const timer = window.setTimeout(
        () => router.replace(`/results/${snapshot.matchId}`),
        1200,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [router, snapshot?.matchId, snapshot?.status]);

  if (!snapshot && loading && !error) return <GameLoading />;

  if (!snapshot) {
    return (
      <GameError
        title="The table is out of reach."
        message={error ?? 'The match snapshot could not be loaded. It may have expired.'}
        code={code}
      />
    );
  }

  if (room?.status === 'waiting') return <GameLoading />;

  return (
    <GameScreen snapshot={snapshot} youId={snapshot.you?.playerId ?? user?.id ?? null} />
  );
}

function GameLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#04120f] text-cream">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <span className="flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.18em] text-cream/30">
          <Loader2 className="size-3.5 animate-spin text-gold" /> Setting the board
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="relative aspect-square w-full max-w-[38rem]">
          <div className="absolute inset-[6%] animate-pulse rounded-full border border-white/5 bg-[radial-gradient(circle,rgba(18,68,56,0.35),rgba(3,15,12,0.8)_65%)]" />
          <div className="absolute inset-[16%] rounded-full border border-gold/10" />
          <div className="absolute inset-[27%] rounded-full border border-gold/10" />
          <div className="absolute inset-[38%] rounded-full border border-gold/10" />
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <div className="flex gap-2">
              <span className="size-2.5 animate-bounce rounded-full bg-[#35b99c] [animation-delay:0ms]" />
              <span className="size-2.5 animate-bounce rounded-full bg-[#e9a23b] [animation-delay:120ms]" />
              <span className="size-2.5 animate-bounce rounded-full bg-[#5b8def] [animation-delay:240ms]" />
              <span className="size-2.5 animate-bounce rounded-full bg-[#df6a8c] [animation-delay:360ms]" />
            </div>
            <p className="mt-5 text-[0.6rem] uppercase tracking-[0.24em] text-cream/30">
              Taking your seat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GameError({ title, message, code }: { title: string; message: string; code: string }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[#04120f] text-cream">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(216,179,106,0.1),transparent_65%)]" />
      <div className="relative flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Logo />
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-lg rounded-3xl border border-gold/15 bg-white/[0.03] p-8 text-center shadow-2xl">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-gold/20 bg-gold/5 text-gold">
            <ShieldAlert className="size-5" />
          </div>
          <p className="mt-6 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-gold">
            Room {code}
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-cream/45">{message}</p>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild size="sm">
              <Link href="/play">
                Back to the lobby <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-white/15 text-cream/70 hover:bg-white/5">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
