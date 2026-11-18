import { HttpStatus } from '@nestjs/common';
import type { ApiErrorCode, GameErrorCode } from '@jackaroo/game-types';
import { ZodError } from 'zod';

export class AppError extends Error {
  readonly code: ApiErrorCode | GameErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: ApiErrorCode | GameErrorCode,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class AuthError extends AppError {
  constructor(message = 'Sign in to continue.') {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }
}

export function notFound(message: string, code: GameErrorCode = 'ROOM_NOT_FOUND'): AppError {
  return new AppError(code, message, HttpStatus.NOT_FOUND);
}

export function forbidden(message = 'You are not allowed to do that.'): AppError {
  return new AppError('FORBIDDEN', message, HttpStatus.FORBIDDEN);
}

export function badRequest(
  code: GameErrorCode | ApiErrorCode,
  message: string,
  details?: unknown,
): AppError {
  return new AppError(code, message, HttpStatus.BAD_REQUEST, details);
}

export function conflict(code: GameErrorCode, message: string): AppError {
  return new AppError(code, message, HttpStatus.CONFLICT);
}

export function parseOrThrow<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: ZodError } },
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      result.error.issues[0]?.message ?? 'Invalid request.',
      HttpStatus.BAD_REQUEST,
      result.error.issues,
    );
  }
  return result.data;
}
