'use client';

import { create } from 'zustand';
import type { GameFeedEvent, GameSnapshot } from '@jackaroo/game-types';

interface GameStore {
  snapshot: GameSnapshot | null;
  feed: GameFeedEvent[];
  feedTick: number;
  error: string | null;
  setSnapshot: (snapshot: GameSnapshot) => void;
  pushFeed: (events: GameFeedEvent[]) => void;
  setPresence: (playerId: string, connected: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  snapshot: null,
  feed: [],
  feedTick: 0,
  error: null,
  setSnapshot: (snapshot) =>
    set((state) => {
      if (state.snapshot && snapshot.version < state.snapshot.version) return state;
      return { snapshot, error: null };
    }),
  pushFeed: (events) =>
    set((state) => ({
      feed: [...state.feed, ...events].slice(-80),
      feedTick: state.feedTick + 1,
    })),
  setPresence: (playerId, connected) =>
    set((state) => {
      if (!state.snapshot) return state;
      return {
        snapshot: {
          ...state.snapshot,
          presence: { ...state.snapshot.presence, [playerId]: connected },
        },
      };
    }),
  setError: (error) => set({ error }),
  clear: () => set({ snapshot: null, feed: [], feedTick: 0, error: null }),
}));
