'use client';

import { create } from 'zustand';
import type { RoomView } from '@jackaroo/game-types';

interface RoomStore {
  room: RoomView | null;
  matchId: string | null;
  error: string | null;
  loading: boolean;
  setRoom: (room: RoomView) => void;
  setMatchId: (matchId: string | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  patchPresence: (playerId: string, connected: boolean) => void;
  clear: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  matchId: null,
  error: null,
  loading: true,
  setRoom: (room) =>
    set((state) => ({
      room,
      matchId: state.matchId,
      error: null,
    })),
  setMatchId: (matchId) => set({ matchId }),
  setError: (error) => set({ error, loading: false }),
  setLoading: (loading) => set({ loading }),
  patchPresence: (playerId, connected) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          players: state.room.players.map((player) =>
            player.id === playerId ? { ...player, connected } : player,
          ),
          seats: state.room.seats.map((seat) =>
            seat.player && seat.player.id === playerId
              ? { ...seat, player: { ...seat.player, connected } }
              : seat,
          ),
        },
      };
    }),
  clear: () => set({ room: null, matchId: null, error: null, loading: false }),
}));
