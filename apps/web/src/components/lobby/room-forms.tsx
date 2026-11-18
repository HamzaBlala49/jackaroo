'use client';

import * as React from 'react';
import { z } from 'zod';
import { roomCodeSchema, type PlayerCount, type RoomView } from '@jackaroo/game-types';
import { getTeamCount } from '@jackaroo/game-config';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, DoorOpen, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SeatDiagram } from '@/components/marketing/seat-diagram';
import { useGameSocket } from '@/lib/socket-provider';
import { emitAck } from '@/lib/socket';
import { useRoomStore } from '@/stores/room-store';
import { getLastRoom } from '@/hooks/use-room-session';
import { fetchPublicRoom, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { soundManager } from '@/lib/sound';

const codeSchema = z.object({
  code: roomCodeSchema,
});

export function CreateRoomPanel({
  initialPlayers = 4,
  compact = false,
}: {
  initialPlayers?: PlayerCount;
  compact?: boolean;
}) {
  const router = useRouter();
  const { socket, connected } = useGameSocket();
  const setRoom = useRoomStore((state) => state.setRoom);
  const [playerCount, setPlayerCount] = React.useState<PlayerCount>(initialPlayers);
  const [creating, setCreating] = React.useState(false);
  const lastRoom = React.useState(() => getLastRoom())[0];

  const create = async () => {
    if (!socket || !connected) {
      toast.error('Connecting to the table. Try again in a moment.');
      return;
    }
    setCreating(true);
    try {
      const response = await emitAck<{ room: RoomView }>(socket, 'room:create', { playerCount });
      if (!response.ok) {
        toast.error(response.error.message);
        return;
      }
      setRoom(response.data.room);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('jackaroo:lastRoom', response.data.room.code);
      }
      soundManager.play('click');
      router.push(`/room/${response.data.room.code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the table.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-gold/20 bg-card/60 p-6 sm:p-8', compact && 'p-5 sm:p-6')}>
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full border border-gold/10" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full border border-gold/5" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-gold">Host the evening</p>
            <h2 className={cn('mt-2 font-display text-3xl font-medium tracking-tight', compact && 'text-2xl')}>
              Open a private table
            </h2>
          </div>
          <span className="hidden size-11 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/8 text-gold sm:flex">
            <DoorOpen className="size-5" />
          </span>
        </div>

        <div className="mt-6">
          <Label>How many seats?</Label>
          <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Number of players">
            {([4, 6, 8] as PlayerCount[]).map((count) => {
              const teams = getTeamCount(count);
              return (
                <button
                  key={count}
                  type="button"
                  role="radio"
                  aria-checked={playerCount === count}
                  onClick={() => {
                    setPlayerCount(count);
                    soundManager.play('click');
                  }}
                  className={cn(
                    'relative flex flex-col items-center rounded-2xl border px-2 py-4 text-center transition-all',
                    playerCount === count
                      ? 'border-gold/55 bg-gold/8 shadow-[0_16px_40px_-24px_rgba(216,179,106,0.7)]'
                      : 'border-border/70 bg-background/20 hover:border-gold/30 hover:bg-card/60',
                  )}
                >
                  <span className="text-gold/70">
                    <SeatDiagram playerCount={count} />
                  </span>
                  <span className="mt-1 font-display text-2xl font-medium leading-none">{count}</span>
                  <span className="mt-1 text-[0.56rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {teams} teams
                  </span>
                  {playerCount === count ? (
                    <span className="absolute right-2 top-2 size-1.5 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border/60 bg-background/25 px-4 py-3 text-[0.7rem] leading-relaxed text-muted-foreground">
          Teams are assigned automatically. Your teammates sit opposite you; four
          marbles each. Every player must press ready before you can start.
        </div>

        <Button className="mt-5 w-full gap-2" size="lg" loading={creating} onClick={create} disabled={!connected}>
          {creating ? 'Setting the table' : 'Create room'}
          {!creating ? <ArrowRight /> : null}
        </Button>

        {lastRoom ? (
          <button
            type="button"
            onClick={() => router.push(`/room/${lastRoom}`)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-border/50 bg-card/30 px-4 py-2.5 text-left text-xs text-muted-foreground transition hover:border-gold/25 hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <LogIn className="size-3.5" />
              Return to your last table
            </span>
            <span className="font-mono text-[0.68rem] tracking-[0.2em] text-gold">{lastRoom}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function JoinRoomPanel({ compact = false, initialCode = '' }: { compact?: boolean; initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = React.useState(
    initialCode.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6),
  );
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    const parsed = codeSchema.safeParse({ code: normalized });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid room code.');
      return;
    }
    setError(null);
    setJoining(true);
    try {
      const room = await fetchPublicRoom(parsed.data.code);
      soundManager.play('click');
      router.push(`/room/${room.code}`);
    } catch (joinError) {
      setError(
        joinError instanceof ApiError ? joinError.message : 'Could not find that room.',
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className={cn('relative overflow-hidden rounded-3xl border border-border/70 bg-card/40 p-6 sm:p-8', compact && 'p-5 sm:p-6')}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full border border-gold/8" />
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-gold">Have an invitation?</p>
      <h2 className={cn('mt-2 font-display text-3xl font-medium tracking-tight', compact && 'text-2xl')}>
        Join with a code
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Six characters from the host. The code is not case-sensitive.
      </p>

      <div className="mt-6 space-y-2">
        <Label htmlFor="room-code">Room code</Label>
        <Input
          id="room-code"
          name="code"
          value={code}
          onChange={(event) => {
            const sanitized = event.target.value
              .toUpperCase()
              .replace(/[^A-HJ-NP-Z2-9]/g, '')
              .slice(0, 6);
            setCode(sanitized);
            setError(null);
          }}
          placeholder="A7K9Q2"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={6}
          className="h-14 text-center font-mono text-xl tracking-[0.5em] placeholder:tracking-[0.4em] placeholder:text-muted-foreground/25"
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <Button type="submit" size="lg" variant="secondary" className="mt-5 w-full gap-2" loading={joining} disabled={code.length !== 6}>
        {joining ? 'Knocking…' : 'Take my seat'}
        {!joining ? <ArrowRight /> : null}
      </Button>

      <div className="mt-5 flex items-center gap-2 text-[0.68rem] text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-full border border-border bg-background/40">
          <span className="size-1.5 rounded-full bg-gold/70" />
        </span>
        Invitation links open the room directly. You will be seated automatically.
      </div>
    </form>
  );
}
