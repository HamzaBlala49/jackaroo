export type GameErrorCode =
  | 'AUTH_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'ROOM_CLOSED'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'PLAYERS_NOT_READY'
  | 'ALREADY_READY'
  | 'NOT_YOUR_TURN'
  | 'GAME_NOT_ACTIVE'
  | 'GAME_FINISHED'
  | 'WRONG_PHASE'
  | 'CARD_NOT_IN_HAND'
  | 'INVALID_ACTION'
  | 'NO_LEGAL_MOVE'
  | 'MARBLE_NOT_ELIGIBLE'
  | 'DESTINATION_INVALID'
  | 'HOME_ENTRY_INVALID'
  | 'SWAP_TARGET_INVALID'
  | 'SPLIT_EXCEEDED'
  | 'DUPLICATE_ACTION'
  | 'ROOM_LOCK_TIMEOUT'
  | 'STATE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type ErrorPayload = {
  code: GameErrorCode | ApiErrorCode;
  message: string;
  details?: unknown;
};

export type Ack<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload };

export const GAME_ERROR_MESSAGES: Partial<Record<GameErrorCode | ApiErrorCode, string>> = {
  AUTH_REQUIRED: 'Sign in to continue.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You are not allowed to do that.',
  ROOM_NOT_FOUND: 'That room could not be found.',
  ROOM_FULL: 'This room is already full.',
  ROOM_IN_PROGRESS: 'This match has already started.',
  ROOM_CLOSED: 'This room has been closed.',
  NOT_HOST: 'Only the host can do that.',
  NOT_ENOUGH_PLAYERS: 'All seats must be filled before the game can start.',
  PLAYERS_NOT_READY: 'Every player must be ready before the game can start.',
  NOT_YOUR_TURN: 'It is not your turn.',
  GAME_NOT_ACTIVE: 'This match is no longer active.',
  GAME_FINISHED: 'This match has already finished.',
  WRONG_PHASE: 'That action is not available right now.',
  CARD_NOT_IN_HAND: 'That card is not in your hand.',
  INVALID_ACTION: 'That move is not legal.',
  NO_LEGAL_MOVE: 'You still have a legal move available.',
  MARBLE_NOT_ELIGIBLE: 'That marble cannot move with this card.',
  DESTINATION_INVALID: 'That destination is not valid.',
  HOME_ENTRY_INVALID: 'Home must be entered with the exact number of steps.',
  SWAP_TARGET_INVALID: 'That marble cannot be swapped.',
  SPLIT_EXCEEDED: 'The split cannot exceed the remaining steps.',
  DUPLICATE_ACTION: 'That action was already applied.',
  ROOM_LOCK_TIMEOUT: 'The room is busy. Please try again.',
  STATE_UNAVAILABLE: 'The match state is temporarily unavailable.',
  RATE_LIMITED: 'Too many attempts. Please slow down.',
};

export function errorPayload(code: GameErrorCode | ApiErrorCode, message?: string): ErrorPayload {
  return {
    code,
    message: message ?? GAME_ERROR_MESSAGES[code] ?? 'Something went wrong.',
  };
}
