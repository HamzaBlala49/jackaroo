'use client';

import { create } from 'zustand';

interface UiStore {
  selectedCardId: string | null;
  focusedMarbleId: string | null;
  swapSourceMarbleId: string | null;
  sevenMarbleId: string | null;
  sevenSteps: number;
  pending: boolean;
  setSelectedCard: (cardId: string | null) => void;
  setFocusedMarble: (marbleId: string | null) => void;
  setSwapSource: (marbleId: string | null) => void;
  setSevenSelection: (marbleId: string | null, steps?: number) => void;
  setSevenSteps: (steps: number) => void;
  setPending: (pending: boolean) => void;
  clearMoveSelection: () => void;
  clearAll: () => void;
}

const initial = {
  selectedCardId: null,
  focusedMarbleId: null,
  swapSourceMarbleId: null,
  sevenMarbleId: null,
  sevenSteps: 1,
  pending: false,
};

export const useUiStore = create<UiStore>((set) => ({
  ...initial,
  setSelectedCard: (selectedCardId) =>
    set({
      selectedCardId,
      focusedMarbleId: null,
      swapSourceMarbleId: null,
      sevenMarbleId: null,
      sevenSteps: 1,
    }),
  setFocusedMarble: (focusedMarbleId) => set({ focusedMarbleId }),
  setSwapSource: (swapSourceMarbleId) => set({ swapSourceMarbleId }),
  setSevenSelection: (sevenMarbleId, steps = 1) => set({ sevenMarbleId, sevenSteps: steps }),
  setSevenSteps: (sevenSteps) => set({ sevenSteps }),
  setPending: (pending) => set({ pending }),
  clearMoveSelection: () =>
    set({ focusedMarbleId: null, swapSourceMarbleId: null, sevenMarbleId: null, sevenSteps: 1 }),
  clearAll: () => set({ ...initial }),
}));
