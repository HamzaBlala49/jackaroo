'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { JoinRoomResult } from '@jackaroo/game-types';
import { useAuth } from '@/lib/auth-provider';
import { emitAck } from '@/lib/socket';
import { useGameSocket } from '@/lib/socket-provider';
import { useRoomStore } from '@/stores/room-store';
import { useGameStore } from '@/stores/game-store';

const LAST_ROOM_KEY = 'jackaroo:lastRoom';

/**
 * Joins (or resumes) a room over the socket. The effect reruns whenever the
 * socket reconnects, which restores the authoritative snapshot after a refresh
 * or a network interruption.
 */
export function useRoomSession(code: string): void {
  const { user } = useAuth();
  const { socket, connected } = useGameSocket();
  const setRoom = useRoomStore((state) => state.setRoom);
  const setMatchId = useRoomStore((state) => state.setMatchId);
  const setError = useRoomStore((state) => state.setError);
  const setLoading = useRoomStore((state) => state.setLoading);
  const setSnapshot = useGameStore((state) => state.setSnapshot);

  React.useEffect(() => {
    if (!user) return;
    if (!socket || !connected) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    const existing = useRoomStore.getState().room;
    setLoading(!existing || existing.code !== code);
    setError(null);

    emitAck<JoinRoomResult>(socket, 'room:join', { code })
      .then((response) => {
        if (cancelled) return;
        if (!response.ok) {
          setError(response.error.message);
          setLoading(false);
          if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem(LAST_ROOM_KEY);
            if (stored === code) window.localStorage.removeItem(LAST_ROOM_KEY);
          }
          return;
        }
        setRoom(response.data.room);
        setMatchId(response.data.matchId ?? null);
        if (response.data.game) setSnapshot(response.data.game);
        setLoading(false);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LAST_ROOM_KEY, code);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setError(error instanceof Error ? error.message : 'Could not join the room.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    code,
    connected,
    setError,
    setLoading,
    setMatchId,
    setRoom,
    setSnapshot,
    socket,
    user,
  ]);
}

export function forgetLastRoom(code?: string): void {
  if (typeof window === 'undefined') return;
  const stored = window.localStorage.getItem(LAST_ROOM_KEY);
  if (!code || stored === code) window.localStorage.removeItem(LAST_ROOM_KEY);
}

export function getLastRoom(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_ROOM_KEY);
}

export function useNotifyError(error: string | null | undefined): void {
  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
}
