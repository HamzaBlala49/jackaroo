import { GAME_ERROR_MESSAGES, type GameErrorCode } from '@jackaroo/game-types';

export class GameRuleError extends Error {
  readonly code: GameErrorCode;
  readonly details?: unknown;

  constructor(code: GameErrorCode, message?: string, details?: unknown) {
    super(message ?? GAME_ERROR_MESSAGES[code] ?? 'That move is not legal.');
    this.name = 'GameRuleError';
    this.code = code;
    this.details = details;
  }
}
