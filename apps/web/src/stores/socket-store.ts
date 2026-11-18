'use client';

import { create } from 'zustand';

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

interface SocketStore {
  status: SocketStatus;
  setStatus: (status: SocketStatus) => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
