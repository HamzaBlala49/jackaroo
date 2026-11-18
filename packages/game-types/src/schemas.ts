import { z } from 'zod';
import { RANKS, SUITS } from './cards';
import type { PlayerCount } from './rules';

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Display name must be at least 2 characters.')
  .max(24, 'Display name must be 24 characters or fewer.')
  .regex(
    /^[\p{L}\p{N} ._'-]+$/u,
    'Use letters, numbers, spaces, apostrophes, periods, underscores or hyphens.',
  );

export const playerCountSchema = z.union([z.literal(4), z.literal(6), z.literal(8)]);

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{6}$/, 'Room codes are six letters or numbers.');

export const actionIdSchema = z.string().uuid('A valid action id is required.');
export const cardIdSchema = z
  .string()
  .regex(/^(A|2|3|4|5|6|7|8|9|10|J|Q|K)[hdsc]$/, 'Unknown card.');

export const authGuestSchema = z.object({
  displayName: displayNameSchema,
});

export const updateMeSchema = z.object({
  displayName: displayNameSchema,
});

export const createRoomPayloadSchema = z.object({
  playerCount: playerCountSchema,
});

export const joinRoomPayloadSchema = z.object({
  code: roomCodeSchema,
});

export const readyPayloadSchema = z.object({
  ready: z.boolean(),
  actionId: actionIdSchema,
});

export const actionPayloadSchema = z.object({
  actionId: actionIdSchema,
});

export const requestStatePayloadSchema = z.object({
  code: roomCodeSchema,
});

export const playRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('enter'),
    marbleId: z.string().min(1).max(80),
  }),
  z.object({
    kind: z.literal('move'),
    marbleId: z.string().min(1).max(80),
    steps: z.number().int().min(1).max(26),
  }),
  z.object({
    kind: z.literal('swap'),
    marbleId: z.string().min(1).max(80),
    targetPlayerId: z.string().min(1).max(80),
    targetMarbleId: z.string().min(1).max(80),
  }),
  z.object({ kind: z.literal('begin-seven') }),
]);

export const playCardPayloadSchema = z.object({
  cardId: cardIdSchema,
  action: playRequestSchema,
  actionId: actionIdSchema,
});

export const makeMovePayloadSchema = z.object({
  marbleId: z.string().min(1).max(80),
  steps: z.number().int().min(1).max(7),
  actionId: actionIdSchema,
});

export const passPayloadSchema = z.object({
  cardId: cardIdSchema,
  actionId: actionIdSchema,
});

export const matchIdSchema = z.string().uuid();

export const cardSchema = z.object({
  id: cardIdSchema,
  suit: z.enum(SUITS),
  rank: z.enum(RANKS),
});

export type AuthGuestInput = z.infer<typeof authGuestSchema>;
export type CreateRoomPayloadInput = z.infer<typeof createRoomPayloadSchema>;

export function assertPlayerCount(value: number): asserts value is PlayerCount {
  if (value !== 4 && value !== 6 && value !== 8) {
    throw new Error('Unsupported player count.');
  }
}
