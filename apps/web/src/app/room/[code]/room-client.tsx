'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  CircleDot,
  ClipboardCopy,
  Copy,
  Loader2,
  LockKeyhole,
  Play,
  Share2,
  Sparkles,
  UserPlus,
  UsersRound,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CARD_RULE_TEXT,
  CARD_RULE_TITLE,
  DEFAULT_RULES,
  TEAM_PALETTES,
  createPublicRules,
  getTeamCount,
} from '@jackaroo/game-config';
import type { Card, RoomView } from '@jackaroo/game-types';
import { OnboardingGate } from '@/components/onboarding-gate';
import { Logo } from '@/components/brand/logo';
import { TableHeader } from '@/components/room/table-header';
import { SeatCard } from '@/components/room/seat-card';
import { PlayingCard } from '@/components/game/playing-card';
import { RulesDialog } from '@/components/rules/rules-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth-provider';
import { useGameSocket } from '@/lib/socket-provider';
import { emitAck } from '@/lib/socket';
import { useRoomSession, forgetLastRoom } from '@/hooks/use-room-session';
import { useRoomStore } from '@/stores/room-store';
import { useGameStore } from '@/stores/game-store';
import { copyText } from '@/lib/utils';
import { SITE_URL } from '@/lib/api';
import { soundManager } from '@/lib/sound';
import { cn } from '@/lib/utils';

export function RoomClient({ code }: { code: string }) {
  return (
    <OnboardingGate context="Waiting room">
      <RoomContent code={code} />
    </OnboardingGate>
  );
}

function RoomContent({ code }: { code: string }) {
  useRoomSession(code);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const room = useRoomStore((state) => state.room);
  const matchId = useRoomStore((state) => state.matchId);
  const loading = useRoomStore((state) => state.loading);
  const error = useRoomStore((state) => state.error);
  const setRoom = useRoomStore((state) => state.setRoom);
  const setMatchId = useRoomStore((state) => state.setMatchId);
  const { socket, connected } = useGameSocket();
  const [readyPending, setReadyPending] = React.useState(false);
  const [startPending, setStartPending] = React.useState(false);
  const [leavePending, setLeavePending] = React.useState(false);
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [copied, setCopied] = React.useState<'code' | 'link' | null>(null);

  React.useEffect(() => {
    if (!room) return;
    if (room.status === 'playing') {
      router.replace(`/game/${code}`);
    } else if (room.status === 'finished' && matchId) {
      router.replace(`/results/${matchId}`);
    }
  }, [code, matchId, room, router]);

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const inviteLink = `${SITE_URL}/room/${room?.code ?? code}`;
  const me = room?.players.find((player) => player.id === user?.id);
  const isHost = room?.hostId === user?.id;
  const playerCount = room?.playerCount ?? 4;
  const filled = room ? room.players.length === room.playerCount : false;
  const allReady = room ? room.players.every((player) => player.ready) : false;
  const allConnected = room ? room.players.every((player) => player.connected) : false;
  const readyCount = room?.players.filter((player) => player.ready).length ?? 0;

  const copy = async (kind: 'code' | 'link') => {
    if (!room) return;
    try {
      await copyText(kind === 'code' ? room.code : inviteLink);
      setCopied(kind);
      toast.success(kind === 'code' ? 'Room code copied.' : 'Invitation link copied.');
      soundManager.play('click');
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error('The clipboard is unavailable on this device.');
    }
  };

  const share = async () => {
    if (!room) return;
    const url = inviteLink;
    const data = {
      title: 'Jackaroo Online',
      text: `Join my Jackaroo table — room ${room.code}.`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        soundManager.play('click');
        return;
      } catch {
        return;
      }
    }
    await copy('link');
  };

  const toggleReady = async () => {
    if (!socket || !connected || !me || !room) return;
    setReadyPending(true);
    try {
      const response = await emitAck<{ room: RoomView }>(socket, 'room:ready', {
        ready: !me.ready,
        actionId: crypto.randomUUID(),
      });
      if (!response.ok) {
        toast.error(response.error.message);
        return;
      }
      setRoom(response.data.room);
      soundManager.play(response.data.room.players.find((player) => player.id === user?.id)?.ready ? 'turn' : 'click');
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Could not update ready state.');
    } finally {
      setReadyPending(false);
    }
  };

  const start = async () => {
    if (!socket || !connected || !room || !isHost) return;
    setStartPending(true);
    try {
      const response = await emitAck<{ matchId: string }>(socket, 'room:start', {
        actionId: crypto.randomUUID(),
      });
      if (!response.ok) {
        toast.error(response.error.message);
        return;
      }
      setMatchId(response.data.matchId);
      soundManager.play('finish');
      router.push(`/game/${room.code}`);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Could not start the match.');
    } finally {
      setStartPending(false);
    }
  };

  const leave = async () => {
    if (!socket || !room) return;
    setLeavePending(true);
    try {
      const response = await emitAck<{ left: true }>(socket, 'room:leave', {
        actionId: crypto.randomUUID(),
      });
      if (!response.ok) {
        toast.error(response.error.message);
        return;
      }
      forgetLastRoom(room.code);
      useRoomStore.getState().clear();
      useGameStore.getState().clear();
      queryClient.removeQueries({ queryKey: ['my-stats'] });
      setLeaveOpen(false);
      router.push('/play');
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Could not leave the room.');
    } finally {
      setLeavePending(false);
    }
  };

  if (!room && loading && !error) return <RoomLoading />;
  if (!room) {
    return <RoomError code={code} message={error ?? 'That room could not be found.'} />;
  }

  const teamCount = getTeamCount(room.playerCount);
  const rules = createPublicRules(DEFAULT_RULES);
  const startDisabled = !isHost || !filled || !allReady || !allConnected || startPending;
  const statusMessage = !filled
    ? `Waiting for ${room.playerCount - room.players.length} more ${
        room.playerCount - room.players.length === 1 ? 'player' : 'players'
      }.`
    : !allReady
      ? `Waiting on ${room.players.filter((player) => !player.ready).length} ready ${
          room.players.filter((player) => !player.ready).length === 1 ? 'check' : 'checks'
        }.`
      : !allConnected
        ? 'Waiting for everyone to reconnect.'
        : 'Everyone is ready. The host can start.';

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#04120f] text-cream">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(216,179,106,0.15),transparent_60%),radial-gradient(ellipse_70%_80%_at_50%_100%,rgba(16,77,62,0.22),transparent_65%)]" />
        <div className="absolute left-1/2 top-1/2 size-[70rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.035]" />
        <div className="absolute left-1/2 top-1/2 size-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.03]" />
        <div className="absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.025]" />
      </div>

      <TableHeader
        room={room}
        rules={rules}
        onLeave={() => setLeaveOpen(true)}
        leaving={leavePending}
      />

      <main className="relative z-10 mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="felt" className="border-gold/20 text-gold">
                  <span className="size-1.5 animate-pulse rounded-full bg-gold" />
                  Waiting room
                </Badge>
                <Badge variant="felt" className="border-white/10 text-cream/45">
                  {room.playerCount} seats · {teamCount} teams
                </Badge>
                <Badge variant="felt" className="border-white/10 text-cream/45">
                  House rules v1
                </Badge>
              </div>
              <h1 className="mt-4 font-display text-4xl font-medium leading-[0.98] tracking-tight text-cream sm:text-5xl lg:text-[3.6rem]">
                {filled && allReady ? 'The table is ready.' : 'Gather round.'}
              </h1>
              <div className="mt-3 flex items-center gap-3 text-sm text-cream/50">
                <span className="flex items-center gap-1.5">
                  <UsersRound className="size-3.5 text-gold/70" />
                  {room.players.length}/{room.playerCount} seated
                </span>
                <span className="size-1 rotate-45 border border-gold/30" />
                <span>{statusMessage}</span>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-[0.6rem] uppercase tracking-[0.15em] text-cream/35 lg:flex">
              <LockKeyhole className="size-3.5 text-gold/60" />
              Invitation-only
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="order-2 space-y-4 xl:order-1">
              <div
                className={cn(
                  'grid gap-3',
                  teamCount === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2',
                  'md:grid-cols-2',
                )}
              >
                {TEAM_PALETTES.slice(0, teamCount).map((team) => {
                  const seats = room.seats.filter((seat) => seat.teamId === team.id);
                  const seated = seats.filter((seat) => seat.player).length;
                  return (
                    <div
                      key={team.id}
                      className="relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.025] p-3.5 sm:p-4"
                      style={{
                        backgroundImage: `radial-gradient(ellipse at 10% 0%, ${team.primary}14, transparent 58%)`,
                      }}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: team.primary, boxShadow: `0 0 12px ${team.glow}` }}
                          />
                          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-cream/60">
                            {team.name}
                          </span>
                        </div>
                        <span className="text-[0.55rem] uppercase tracking-[0.16em] text-cream/25">
                          {seated}/{seats.length} seated
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <AnimatePresence initial={false}>
                          {seats.map((seat) => (
                            <SeatCard
                              key={`${seat.seat}-${seat.player?.id ?? 'empty'}`}
                              seat={seat}
                              team={team}
                              isYou={seat.player?.id === user?.id}
                              isHost={seat.player?.id === room.hostId}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[0.65rem] text-cream/35">
                <span className="flex items-center gap-2">
                  <CircleDot className="size-3.5 text-gold/60" />
                  Teammates are always opposite. Seats fill in table order.
                </span>
                <RulesDialog
                  rules={rules}
                  trigger={
                    <button type="button" className="font-semibold uppercase tracking-[0.14em] text-gold/70 transition hover:text-gold">
                      Read the rules
                    </button>
                  }
                />
              </div>

              <TablePrimer rules={rules} />
            </section>

            <aside className="order-1 space-y-4 xl:order-2">
              <InvitePanel
                room={room}
                inviteLink={inviteLink}
                copied={copied}
                onCopy={copy}
                onShare={share}
              />

              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-gold">
                    Your seat
                  </p>
                  {me?.ready ? (
                    <Badge variant="felt" className="border-emerald-400/25 text-emerald-300">
                      <Check className="size-2.5" /> Ready
                    </Badge>
                  ) : (
                    <Badge variant="felt" className="border-white/10 text-cream/35">
                      Not ready
                    </Badge>
                  )}
                </div>
                <div className="mt-4 space-y-2.5">
                  <ChecklistRow
                    ok={filled}
                    label={
                      filled
                        ? 'All seats are filled'
                        : `${room.playerCount - room.players.length} seat${
                            room.playerCount - room.players.length === 1 ? '' : 's'
                          } still open`
                    }
                  />
                  <ChecklistRow
                    ok={allReady}
                    label={
                      allReady
                        ? 'Everyone is ready'
                        : `${readyCount}/${room.playerCount} players ready`
                    }
                  />
                  <ChecklistRow ok={allConnected} label={allConnected ? 'Everyone is connected' : 'A player is reconnecting'} />
                </div>

                <div className="mt-5 space-y-2">
                  <Button
                    type="button"
                    variant={me?.ready ? 'secondary' : 'default'}
                    size="lg"
                    className="w-full"
                    loading={readyPending}
                    disabled={readyPending || !connected}
                    onClick={toggleReady}
                  >
                    {me?.ready ? (
                      <>
                        <Check /> Ready — stand by
                      </>
                    ) : (
                      <>
                        <Sparkles /> I&apos;m ready
                      </>
                    )}
                  </Button>

                  {isHost ? (
                    <Button
                      type="button"
                      size="lg"
                      variant={!startDisabled ? 'default' : 'secondary'}
                      className={cn('w-full', !startDisabled && 'animate-pulse-gold')}
                      disabled={startDisabled}
                      loading={startPending}
                      onClick={start}
                    >
                      {startPending ? 'Opening the table' : 'Start the match'}
                      {!startPending ? <Play /> : null}
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-center text-xs text-cream/40">
                      {room.players.find((player) => player.id === room.hostId)?.displayName ?? 'The host'} starts the
                      match when the table is ready.
                    </div>
                  )}
                </div>

                {!connected ? (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[0.65rem] text-amber-200/80">
                    <WifiOff className="size-3.5" /> Reconnecting to the table…
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 px-1">
                <button
                  type="button"
                  onClick={() => setLeaveOpen(true)}
                  className="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-cream/30 transition hover:text-rose-300"
                >
                  Leave the table
                </button>
                <span className="text-[0.58rem] uppercase tracking-[0.14em] text-cream/20">
                  {room.code}
                </span>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the table?</AlertDialogTitle>
            <AlertDialogDescription>
              {isHost
                ? room.players.length > 1
                  ? 'You are the host. The host role will pass to the next seated player.'
                  : 'You are the last player. The room will be closed.'
                : 'Your seat will be released and your invitation code will no longer include you.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leavePending}>Stay seated</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:brightness-110"
              disabled={leavePending}
              onClick={(event) => {
                event.preventDefault();
                void leave();
              }}
            >
              {leavePending ? <Loader2 className="animate-spin" /> : null}
              Leave room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TablePrimer({ rules }: { rules: ReturnType<typeof createPublicRules> }) {
  const primer: Card[] = [
    { id: 'As', rank: 'A', suit: 'spades' },
    { id: '7h', rank: '7', suit: 'hearts' },
    { id: '4d', rank: '4', suit: 'diamonds' },
  ];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
      <div className="pointer-events-none absolute -bottom-16 -right-12 size-48 rounded-full border border-gold/10" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-gold">
            Before the first card
          </p>
          <h2 className="mt-1.5 font-display text-2xl text-cream">Four cards. One lap. No shortcuts.</h2>
        </div>
        <span className="text-[0.55rem] uppercase tracking-[0.14em] text-cream/25">
          {rules.deckSize} cards · {rules.cardsPerPlayer} per hand
        </span>
      </div>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
        {primer.map((card) => (
          <div key={card.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/10 p-3">
            <PlayingCard card={card} size="sm" asButton={false} className="shadow-lg" />
            <div className="min-w-0">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.13em] text-gold/75">
                {CARD_RULE_TITLE[card.rank]} · {card.rank}
              </p>
              <p className="mt-1 text-[0.64rem] leading-relaxed text-cream/35">
                {CARD_RULE_TEXT[card.rank]}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.56rem] uppercase tracking-[0.12em] text-cream/25">
        <span>All four marbles home wins the team the table</span>
        <span className="size-1 rotate-45 border border-gold/30" />
        <span>Exact home entry</span>
        <span className="size-1 rotate-45 border border-gold/30" />
        <span>Server-checked moves</span>
      </div>
    </div>
  );
}

function InvitePanel({
  room,
  inviteLink,
  copied,
  onCopy,
  onShare,
}: {
  room: RoomView;
  inviteLink: string;
  copied: 'code' | 'link' | null;
  onCopy: (kind: 'code' | 'link') => void;
  onShare: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-[#081c16]/80 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
      <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full border border-gold/10" />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-gold">
              Invitation
            </p>
            <h2 className="mt-1.5 font-display text-2xl text-cream">Bring your table</h2>
          </div>
          <UserPlus className="size-4 text-gold/60" />
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {room.code.split('').map((character, index) => (
            <span
              key={`${character}-${index}`}
              className="flex size-9 items-center justify-center rounded-lg border border-gold/25 bg-[#03120d] font-mono text-sm font-semibold tracking-wide text-gold shadow-inner sm:text-base"
            >
              {character}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/12 text-cream/75 hover:border-gold/35 hover:bg-white/5"
            onClick={() => onCopy('code')}
          >
            {copied === 'code' ? <Check /> : <Copy />}
            Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/12 text-cream/75 hover:border-gold/35 hover:bg-white/5"
            onClick={() => onCopy('link')}
          >
            {copied === 'link' ? <Check /> : <ClipboardCopy />}
            Link
          </Button>
        </div>

        <button
          type="button"
          onClick={onShare}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-transparent py-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-gold/70 transition hover:border-gold/20 hover:bg-gold/5 hover:text-gold"
        >
          <Share2 className="size-3.5" />
          Share invitation
        </button>

        <p className="mt-3 truncate rounded-lg border border-white/5 bg-black/15 px-2.5 py-1.5 text-center font-mono text-[0.58rem] text-cream/30">
          {inviteLink}
        </p>
      </div>
    </div>
  );
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border',
          ok
            ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
            : 'border-white/10 bg-white/[0.02] text-cream/25',
        )}
      >
        {ok ? <Check className="size-3" /> : <span className="size-1 rounded-full bg-current" />}
      </span>
      <span className={ok ? 'text-cream/65' : 'text-cream/35'}>{label}</span>
    </div>
  );
}

function RoomLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#04120f] text-cream">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <Loader2 className="size-4 animate-spin text-gold" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="relative flex aspect-square w-full max-w-md flex-col items-center justify-center rounded-full border border-white/5">
          <div className="absolute inset-10 rounded-full border border-white/5" />
          <div className="absolute inset-20 rounded-full border border-white/5" />
          <div className="flex size-16 items-center justify-center rounded-full border border-gold/25 bg-gold/5">
            <Loader2 className="size-5 animate-spin text-gold" />
          </div>
          <p className="mt-6 text-[0.62rem] uppercase tracking-[0.22em] text-cream/35">
            Taking your seat
          </p>
        </div>
      </div>
    </div>
  );
}

function RoomError({ code, message }: { code: string; message: string }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[#04120f] text-cream">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-gold/15 bg-white/[0.03] p-8 text-center shadow-2xl">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-gold/20 bg-gold/5">
            <LockKeyhole className="size-5 text-gold" />
          </div>
          <p className="mt-6 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-gold">
            Room {code}
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium">This table isn&apos;t taking guests.</h1>
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
