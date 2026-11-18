'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { GameSnapshot, RoomView } from '@jackaroo/game-types';
import { useAuth, ME_QUERY_KEY } from '@/lib/auth-provider';
import { createGameSocket, type GameSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/game-store';
import { useRoomStore } from '@/stores/room-store';
import { useSocketStore } from '@/stores/socket-store';
import { soundManager } from '@/lib/sound';

interface SocketContextValue {
  socket: GameSocket | null;
  connected: boolean;
}

const SocketContext = React.createContext<SocketContextValue | null>(null);

function isRoomPath(pathname: string): boolean {
  return pathname.startsWith('/room/');
}
function isGamePath(pathname: string): boolean {
  return pathname.startsWith('/game/');
}
function isResultsPath(pathname: string): boolean {
  return pathname.startsWith('/results/');
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [socket, setSocket] = React.useState<GameSocket | null>(null);
  const status = useSocketStore((state) => state.status);
  const setStatus = useSocketStore((state) => state.setStatus);
  const pathRef = React.useRef(pathname);

  React.useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const userId = user?.id;

  React.useEffect(() => {
    if (!userId) return;

    const instance = createGameSocket();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Socket.IO is an external system; this state mirrors the live connection.
    setSocket(instance);
    setStatus('connecting');

    const onConnect = () => {
      setStatus('connected');
    };
    const onDisconnect = (reason: string) => {
      setStatus(reason === 'io client disconnect' ? 'idle' : 'reconnecting');
    };
    const onReconnectAttempt = () => setStatus('reconnecting');
    const onConnectError = (error: Error) => {
      setStatus('reconnecting');
      if (error.message.includes('AUTH_REQUIRED')) {
        void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        toast.error('Your session expired. Take a seat again.');
      }
    };
    const onRoomUpdated = (room: RoomView) => {
      useRoomStore.getState().setRoom(room);
      if (isResultsPath(pathRef.current) && room.status === 'waiting') {
        router.push(`/room/${room.code}`);
      }
      if (isRoomPath(pathRef.current) && room.status === 'playing') {
        router.push(`/game/${room.code}`);
      }
      if (isGamePath(pathRef.current) && room.status === 'waiting') {
        router.push(`/room/${room.code}`);
      }
    };
    const onGameStarted = ({ code }: { matchId: string; code: string }) => {
      if (isRoomPath(pathRef.current)) {
        router.push(`/game/${code}`);
      }
    };
    const onGameState = (snapshot: GameSnapshot) => {
      useGameStore.getState().setSnapshot(snapshot);
    };
    const onGameFeed = (payload: { events: import('@jackaroo/game-types').GameFeedEvent[]; version: number }) => {
      useGameStore.getState().pushFeed(payload.events);
      soundManager.handleFeed(payload.events);
    };
    const onPresence = (payload: { playerId: string; connected: boolean }) => {
      useGameStore.getState().setPresence(payload.playerId, payload.connected);
      useRoomStore.getState().patchPresence(payload.playerId, payload.connected);
    };
    const onRoomClosed = ({ reason }: { reason: 'host-left' | 'expired' | 'closed' }) => {
      const message =
        reason === 'expired'
          ? 'That room expired after everyone left.'
          : reason === 'host-left'
            ? 'The host closed the room.'
            : 'The room was closed.';
      toast.info(message);
      useRoomStore.getState().clear();
      useGameStore.getState().clear();
      if (isRoomPath(pathRef.current) || isGamePath(pathRef.current) || isResultsPath(pathRef.current)) {
        router.push('/');
      }
    };
    const onGameFinished = ({ matchId, code }: { matchId: string; code: string }) => {
      void matchId;
      void code;
      toast.success('The table has spoken — final scores are ready.', { duration: 3500 });
    };
    const onGameError = (payload: { message: string }) => {
      toast.error(payload.message);
    };

    instance.on('connect', onConnect);
    instance.on('disconnect', onDisconnect);
    instance.io.on('reconnect_attempt', onReconnectAttempt);
    instance.on('connect_error', onConnectError);
    instance.on('room:updated', onRoomUpdated);
    instance.on('game:started', onGameStarted);
    instance.on('game:state', onGameState);
    instance.on('game:feed', onGameFeed);
    instance.on('presence:updated', onPresence);
    instance.on('room:closed', onRoomClosed);
    instance.on('game:finished', onGameFinished);
    instance.on('game:error', onGameError);
    instance.connect();

    return () => {
      instance.io.off('reconnect_attempt', onReconnectAttempt);
      instance.removeAllListeners();
      instance.disconnect();
      setSocket((current) => (current === instance ? null : current));
      setStatus('idle');
    };
  }, [userId, queryClient, router, setStatus]);

  React.useEffect(() => {
    const unlock = () => soundManager.unlockFromGesture();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const value: SocketContextValue = {
    socket,
    connected: status === 'connected',
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useGameSocket(): SocketContextValue {
  const value = React.useContext(SocketContext);
  if (!value) throw new Error('useGameSocket must be used inside SocketProvider');
  return value;
}

export function useSocketStatus() {
  return useSocketStore((state) => state.status);
}
