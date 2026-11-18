import type { GameFeedEvent, GameSnapshot, PlayRequest } from '@jackaroo/game-types';

export const LAN_PORT = 4242;
export const PROTOCOL_VERSION = 1;

export interface LobbyPlayerInfo {
  seat: number;
  name: string;
  isHost: boolean;
  connected: boolean;
  isBot: boolean;
}

/** Messages a client sends to the host. */
export type ClientMessage =
  | { t: 'join'; v: number; name: string }
  | {
      t: 'action';
      actionId: string;
      kind: 'play' | 'pass' | 'seven-move' | 'seven-end';
      cardId?: string;
      request?: PlayRequest;
      marbleId?: string;
      steps?: number;
    }
  | { t: 'ping' }
  | { t: 'bye' };

/** Messages the host sends to a client. */
export type HostMessage =
  | {
      t: 'welcome';
      v: number;
      seat: number;
      hostName: string;
      playerCount: number;
      boardShape: string;
    }
  | { t: 'lobby'; players: LobbyPlayerInfo[] }
  | { t: 'start'; seat: number; matchId: string }
  | { t: 'state'; snapshot: GameSnapshot }
  | { t: 'feed'; events: GameFeedEvent[] }
  | { t: 'error'; code: string; message: string }
  | { t: 'pong' }
  | { t: 'closed'; reason: string };

export function encodeMessage(message: unknown): string {
  return `${JSON.stringify(message)}\n`;
}

/** Splits a TCP chunk buffer into complete newline-delimited JSON messages. */
export function decodeMessages(buffer: string): { messages: unknown[]; rest: string } {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  const messages: unknown[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      messages.push(JSON.parse(trimmed));
    } catch {
      // Ignore malformed lines rather than dropping the connection.
    }
  }
  return { messages, rest };
}
