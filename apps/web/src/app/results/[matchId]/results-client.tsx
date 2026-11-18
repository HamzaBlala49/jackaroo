'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  ArrowRight,
  Check,
  Clock3,
  Crown,
  Layers2,
  Loader2,
  LogOut,
  MoveHorizontal,
  Repeat2,
  Sparkles,
  Swords,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MatchResultView, RoomView } from '@jackaroo/game-types';
import { DEFAULT_RULES, createPublicRules, getTeamPalette } from '@jackaroo/game-config';
import { OnboardingGate } from '@/components/onboarding-gate';
import { Logo, LogoMark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { RulesDialog } from '@/components/rules/rules-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-provider';
import { fetchMatch, ApiError } from '@/lib/api';
import { emitAck } from '@/lib/socket';
import { useGameSocket } from '@/lib/socket-provider';
import { useRoomSession, forgetLastRoom } from '@/hooks/use-room-session';
import { useRoomStore } from '@/stores/room-store';
import { useGameStore } from '@/stores/game-store';
import { copyText, formatDuration, formatNumber, formatRelativeDate, initials, cn } from '@/lib/utils';
import { soundManager } from '@/lib/sound';

export function ResultsClient({ matchId }: { matchId: string }) {
  return (
    <OnboardingGate context="Final scores">
      <ResultsLoader matchId={matchId} />
    </OnboardingGate>
  );
}

function ResultsLoader({ matchId }: { matchId: string }) {
  const query = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => fetchMatch(matchId),
    retry: false,
    staleTime: Infinity,
  });

  if (query.isPending) return <ResultsLoading />;
  if (query.isError) {
    const message =
      query.error instanceof ApiError ? query.error.message : 'The final scores could not be loaded.';
    return <ResultsError message={message} />;
  }
  if (!query.data) return <ResultsError message="That match could not be found." />;
  return <ResultsContent match={query.data} />;
}

function ResultsContent({ match }: { match: MatchResultView }) {
  useRoomSession(match.roomCode);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const room = useRoomStore((state) => state.room);
  const setRoom = useRoomStore((state) => state.setRoom);
  const { socket, connected } = useGameSocket();
  const [rematchPending, setRematchPending] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const rules = createPublicRules(DEFAULT_RULES);

  const winnerTeam = match.winnerTeamId !== null ? getTeamPalette(match.winnerTeamId) : null;
  const winners = match.players.filter((player) => player.won);
  const isHost = room?.hostId === user?.id;
  const youWon = Boolean(user && match.players.some((player) => player.userId === user.id && player.won));
  const totalCaptures = match.players.reduce((total, player) => total + player.captures, 0);

  React.useEffect(() => {
    if (room?.status === 'waiting') {
      router.push(`/room/${room.code}`);
    }
  }, [room?.status, room?.code, router]);

  const rematch = async () => {
    if (!socket || !connected) {
      toast.error('Reconnecting to your table…');
      return;
    }
    setRematchPending(true);
    try {
      const response = await emitAck<{ room: RoomView }>(socket, 'room:rematch', {
        actionId: crypto.randomUUID(),
      });
      if (!response.ok) {
        toast.error(response.error.message);
        return;
      }
      soundManager.play('click');
      setRoom(response.data.room);
      router.push(`/room/${match.roomCode}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start a rematch.');
    } finally {
      setRematchPending(false);
    }
  };

  const returnToLobby = async () => {
    setLeaving(true);
    try {
      if (socket && connected) {
        await emitAck(socket, 'room:leave', { actionId: crypto.randomUUID() });
      }
    } catch {
      // A finished room may already have expired; leaving the page is still safe.
    } finally {
      forgetLastRoom(match.roomCode);
      useRoomStore.getState().clear();
      useGameStore.getState().clear();
      queryClient.invalidateQueries({ queryKey: ['my-stats'] });
      router.push('/');
    }
  };

  const copyResult = async () => {
    try {
      await copyText(`Jackaroo Online — room ${match.roomCode} finished in ${formatDuration(match.durationSeconds)}.`);
      setCopied(true);
      toast.success('Result copied.');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy the result.');
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#04120f] text-cream">
      <Confetti colors={winnerTeam ? [winnerTeam.primary, winnerTeam.pale, '#d8b36a', '#f2d79b'] : ['#d8b36a', '#f2d79b']} />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(216,179,106,0.17),transparent_60%),radial-gradient(ellipse_50%_60%_at_50%_110%,rgba(15,63,51,0.24),transparent_65%)]" />
        <div className="absolute left-1/2 top-[38%] size-[64rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.035]" />
        <div className="absolute left-1/2 top-[38%] size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.03]" />
        <div className="absolute left-1/2 top-[38%] size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.025]" />
      </div>

      <header className="relative z-20 flex h-14 items-center justify-between px-3 sm:h-16 sm:px-6 lg:px-8">
        <div className="sm:hidden">
          <LogoMark size={32} />
        </div>
        <div className="hidden sm:block">
          <Logo />
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="felt" className="mr-1 hidden border-white/10 text-cream/35 sm:inline-flex">
            Final scores
          </Badge>
          <RulesDialog
            rules={rules}
            trigger={
              <Button variant="ghost" size="icon" className="text-cream/55 hover:bg-white/5 hover:text-cream" aria-label="Open the rulebook">
                <BookOpen />
              </Button>
            }
          />
          <ThemeToggle className="text-cream/55 hover:bg-white/5 hover:text-cream" />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <div
            className="relative mx-auto flex size-28 items-center justify-center rounded-full border sm:size-32"
            style={{
              borderColor: winnerTeam ? `${winnerTeam.primary}66` : 'rgba(216,179,106,0.35)',
              background: winnerTeam
                ? `radial-gradient(circle at 35% 25%, ${winnerTeam.primary}30, rgba(3,18,14,0.9) 68%)`
                : 'rgba(3,18,14,0.8)',
              boxShadow: winnerTeam ? `0 0 80px -20px ${winnerTeam.glow}` : undefined,
            }}
          >
            <span className="absolute inset-2 rounded-full border border-white/10" />
            <span className="absolute inset-5 rounded-full border border-gold/10" />
            <Trophy className="relative size-10 text-gold-bright sm:size-12" />
          </div>
          <p className="mt-6 text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-gold">
            {youWon ? 'Your table won' : 'The final whistle'}
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
            {winnerTeam ? (
              <>
                <span style={{ color: winnerTeam.primary }}>{winnerTeam.name}</span>
                <br />
                <span className="italic text-muted-foreground">takes the table.</span>
              </>
            ) : (
              'The table has closed.'
            )}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream/45">
            {winners.length > 0
              ? `${winners.map((player) => player.displayName).join(' & ')} brought all eight team marbles home.`
              : 'This match ended without a winning team.'}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {winners.map((player) => (
              <span
                key={player.userId}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                style={{
                  borderColor: winnerTeam ? `${winnerTeam.primary}33` : 'rgba(255,255,255,0.1)',
                  backgroundColor: winnerTeam ? `${winnerTeam.primary}12` : 'rgba(255,255,255,0.03)',
                }}
              >
                <Crown className="size-3.5 text-gold" />
                {player.displayName}
                {player.userId === user?.id ? <span className="text-[0.55rem] text-gold">you</span> : null}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultStat icon={<Clock3 />} label="Match time" value={formatDuration(match.durationSeconds)} />
          <ResultStat icon={<Repeat2 />} label="Turns played" value={formatNumber(match.turnCount)} />
          <ResultStat icon={<MoveHorizontal />} label="Marbles moved" value={formatNumber(match.moveCount)} />
          <ResultStat icon={<Swords />} label="Captures" value={formatNumber(totalCaptures)} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-3xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-gold">
                  Every seat
                </p>
                <h2 className="mt-1 font-display text-2xl">Match statistics</h2>
              </div>
              <Badge variant="felt" className="border-white/10 text-cream/35">
                {match.playerCount} players
              </Badge>
            </div>

            <div className="mt-5 space-y-2">
              {match.players.map((player) => {
                const palette = getTeamPalette(player.teamId);
                const isYou = player.userId === user?.id;
                return (
                  <div
                    key={player.userId}
                    className={cn(
                      'flex flex-wrap items-center gap-3 rounded-2xl border px-3.5 py-3',
                      player.won ? 'border-gold/20 bg-gold/[0.045]' : 'border-white/[0.06] bg-black/10',
                    )}
                  >
                    <Avatar className="size-9 border" style={{ borderColor: `${palette.primary}55` }}>
                      <AvatarFallback
                        className="text-[0.58rem] font-bold"
                        style={{ backgroundColor: palette.deep, color: palette.pale }}
                      >
                        {initials(player.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-[7rem] flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {player.displayName}
                        {isYou ? <span className="text-[0.52rem] font-bold uppercase tracking-[0.12em] text-gold">you</span> : null}
                        {player.won ? <Crown className="size-3.5 text-gold" /> : null}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[0.55rem] uppercase tracking-[0.12em]" style={{ color: palette.primary }}>
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: palette.primary }} />
                        {palette.shortName} · seat {player.seat + 1}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-center">
                      <MiniStat label="Home" value={`${player.marblesHome}/4`} />
                      <MiniStat label="Moves" value={String(player.moves)} />
                      <MiniStat label="Captures" value={String(player.captures)} />
                      <MiniStat label="Cards" value={String(player.cardsPlayed)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-gold">
                Match record
              </p>
              <div className="mt-3 space-y-2.5 text-xs text-cream/45">
                <div className="flex items-center justify-between">
                  <span>Room</span>
                  <span className="font-mono tracking-[0.16em] text-cream/70">{match.roomCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Started</span>
                  <span className="text-cream/70">{formatRelativeDate(match.startedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Table</span>
                  <span className="flex items-center gap-1 text-cream/70">
                    <UsersRound className="size-3" /> {match.playerCount} players
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Result</span>
                  <span className="text-cream/70">{winnerTeam?.name ?? 'No winner'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={copyResult}
                className="mt-4 w-full rounded-lg border border-white/8 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-cream/35 transition hover:border-gold/25 hover:text-gold"
              >
                {copied ? 'Copied' : 'Copy result'}
              </button>
            </div>

            <div className="rounded-3xl border border-gold/18 bg-gold/[0.045] p-5">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-gold">
                One more hand?
              </p>
              {isHost ? (
                <Button className="mt-3 w-full gap-2" onClick={() => void rematch()} loading={rematchPending} disabled={!connected}>
                  Play again <Repeat2 />
                </Button>
              ) : (
                <div className="mt-3 rounded-xl border border-white/8 bg-black/15 px-3 py-3 text-center text-[0.68rem] leading-relaxed text-cream/40">
                  <span className="mx-auto mb-1.5 flex w-fit gap-1">
                    <span className="size-1 animate-pulse rounded-full bg-gold" />
                    <span className="size-1 animate-pulse rounded-full bg-gold [animation-delay:150ms]" />
                    <span className="size-1 animate-pulse rounded-full bg-gold [animation-delay:300ms]" />
                  </span>
                  Waiting for the host to open a rematch.
                </div>
              )}
              <Button
                variant="outline"
                className="mt-2 w-full gap-2 border-white/12 text-cream/60 hover:bg-white/5"
                onClick={() => void returnToLobby()}
                loading={leaving}
              >
                <LogOut />
                Return to lobby
              </Button>
              <p className="mt-3 text-center text-[0.58rem] leading-relaxed text-cream/25">
                A rematch keeps the same room and seats. Ready checks reset.
              </p>
            </div>

            <div className="flex items-center justify-between text-[0.6rem] text-cream/25">
              <Link href="/rules" className="transition hover:text-gold">
                Read the rulebook
              </Link>
              <Link href="/play" className="flex items-center gap-1 transition hover:text-gold">
                Lobby <ArrowRight className="size-3" />
              </Link>
            </div>
          </aside>
        </div>

        <div className="mt-8 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-cream/25 transition hover:text-gold">
            <ArrowLeft className="size-3" /> Back to the landing page
          </Link>
        </div>
      </main>
    </div>
  );
}

function ResultStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <p className="flex items-center gap-1.5 text-[0.52rem] font-semibold uppercase tracking-[0.15em] text-cream/30 [&_svg]:size-3 [&_svg]:text-gold/60">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-display text-2xl text-cream/85">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-sm text-cream/80">{value}</p>
      <p className="text-[0.45rem] uppercase tracking-[0.12em] text-cream/25">{label}</p>
    </div>
  );
}

function Confetti({ colors }: { colors: string[] }) {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 64 }, (_, index) => ({
        left: (index * 37 + 13) % 100,
        delay: (index % 14) * 0.22,
        duration: 5.5 + (index % 8) * 0.45,
        drift: ((index * 29) % 160) - 80,
        spin: 360 + (index % 5) * 180,
        size: 4 + (index % 4) * 2,
        color: colors[index % colors.length]!,
        round: index % 3 === 0,
      })),
    [colors],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden" aria-hidden>
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="absolute top-0 block opacity-0"
          style={
            {
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.round ? piece.size : piece.size * 2.2,
              borderRadius: piece.round ? '999px' : '1px',
              backgroundColor: piece.color,
              animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
              '--drift': `${piece.drift}px`,
              '--spin': `${piece.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function ResultsLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#04120f] text-cream">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <Loader2 className="size-4 animate-spin text-gold" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-cream/35">
          <Trophy className="size-10 text-gold/50" />
          <p className="text-[0.6rem] uppercase tracking-[0.24em]">Counting the marbles</p>
        </div>
      </div>
    </div>
  );
}

function ResultsError({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#04120f] text-cream">
      <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-3xl border border-white/8 bg-white/[0.03] p-8 text-center">
          <Sparkles className="mx-auto size-8 text-gold/60" />
          <h1 className="mt-5 font-display text-3xl">The final scores aren&apos;t here.</h1>
          <p className="mt-3 text-sm leading-relaxed text-cream/45">{message}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild size="sm">
              <Link href="/play">Back to lobby <ArrowRight /></Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-white/15 text-cream/70 hover:bg-white/5">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
