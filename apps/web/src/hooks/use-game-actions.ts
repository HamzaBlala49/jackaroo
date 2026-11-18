'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { GameSnapshot, PlayRequest } from '@jackaroo/game-types';
import { emitAck } from '@/lib/socket';
import { useGameSocket } from '@/lib/socket-provider';
import { useGameStore } from '@/stores/game-store';
import { useUiStore } from '@/stores/ui-store';
import { soundManager } from '@/lib/sound';

type StateResponse = { state: GameSnapshot };

export function useGameActions(code: string) {
  const { socket, connected } = useGameSocket();
  const pending = useUiStore((state) => state.pending);
  const setPending = useUiStore((state) => state.setPending);
  const clearAll = useUiStore((state) => state.clearAll);
  const clearMoveSelection = useUiStore((state) => state.clearMoveSelection);
  const setSnapshot = useGameStore((state) => state.setSnapshot);
  const [lastError, setLastError] = React.useState<string | null>(null);

  const resync = React.useCallback(() => {
    if (!socket || !connected) return;
    void emitAck<StateResponse>(socket, 'game:request-state', { code }).then((response) => {
      if (response.ok) setSnapshot(response.data.state);
    });
  }, [code, connected, setSnapshot, socket]);

  const send = React.useCallback(
    async (
      event: 'game:play-card' | 'game:make-move' | 'game:end-turn' | 'game:pass',
      payload: Record<string, unknown>,
      onSuccess?: (state: GameSnapshot) => void,
    ): Promise<boolean> => {
      if (!socket || !connected) {
        toast.error('Reconnecting to the table…');
        return false;
      }
      setPending(true);
      setLastError(null);
      try {
        const response = await emitAck<StateResponse>(socket, event, {
          ...payload,
          actionId: crypto.randomUUID(),
        });
        if (!response.ok) {
          setLastError(response.error.message);
          toast.error(response.error.message);
          soundManager.play('error');
          resync();
          return false;
        }
        setSnapshot(response.data.state);
        onSuccess?.(response.data.state);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The move could not be sent.';
        setLastError(message);
        toast.error(message);
        resync();
        return false;
      } finally {
        setPending(false);
      }
    },
    [connected, resync, setPending, setSnapshot, socket],
  );

  const playCard = React.useCallback(
    async (cardId: string, action: PlayRequest): Promise<boolean> => {
      return send('game:play-card', { cardId, action }, () => clearAll());
    },
    [clearAll, send],
  );

  const makeSevenMove = React.useCallback(
    async (marbleId: string, steps: number): Promise<boolean> => {
      return send('game:make-move', { marbleId, steps }, () => {
        clearMoveSelection();
      });
    },
    [clearMoveSelection, send],
  );

  const endSevenTurn = React.useCallback(async (): Promise<boolean> => {
    return send('game:end-turn', {}, () => clearAll());
  }, [clearAll, send]);

  const pass = React.useCallback(
    async (cardId: string): Promise<boolean> => {
      return send('game:pass', { cardId }, () => clearAll());
    },
    [clearAll, send],
  );

  return {
    pending,
    lastError,
    playCard,
    makeSevenMove,
    endSevenTurn,
    pass,
    resync,
  };
}
