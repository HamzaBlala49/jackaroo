'use client';

import { io, type Socket } from 'socket.io-client';
import type {
  Ack,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@jackaroo/game-types';
import { API_URL } from './api';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createGameSocket(): GameSocket {
  return io(`${API_URL}/game`, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 600,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.4,
    timeout: 10_000,
  });
}

export function emitAck<T>(
  socket: GameSocket,
  event: keyof ClientToServerEvents,
  payload: unknown,
  timeout = 12_000,
): Promise<Ack<T>> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`The server did not answer ${String(event)} in time.`));
    }, timeout);

    const callback = (response: Ack<T>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(response);
    };

    try {
      // The public helper keeps call sites strongly typed at the payload level
      // while Socket.IO's overloads require a cast for a generic event key.
      (socket.emit as unknown as (ev: string, data: unknown, cb: (res: Ack<T>) => void) => void)(
        event,
        payload,
        callback,
      );
    } catch (error) {
      clearTimeout(timer);
      settled = true;
      reject(error);
    }
  });
}
