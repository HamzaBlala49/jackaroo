import type {
  AuthUser,
  MatchResultView,
  RoomView,
  UserStatsView,
} from '@jackaroo/game-types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      error?.details,
    );
  }

  return body as T;
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const response = await apiFetch<{ user: AuthUser }>('/auth/me');
    return response.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function guestLogin(displayName: string): Promise<AuthUser> {
  const response = await apiFetch<{ user: AuthUser }>('/auth/guest', {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });
  return response.user;
}

export async function logout(): Promise<void> {
  await apiFetch<{ ok: true }>('/auth/logout', { method: 'POST' });
}

export async function updateDisplayName(displayName: string): Promise<AuthUser> {
  const response = await apiFetch<{ user: AuthUser }>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
  return response.user;
}

export async function fetchPublicRoom(code: string): Promise<RoomView> {
  const response = await apiFetch<{ room: RoomView }>(`/rooms/${encodeURIComponent(code)}`);
  return response.room;
}

export async function fetchMatch(matchId: string): Promise<MatchResultView> {
  const response = await apiFetch<{ match: MatchResultView }>(`/matches/${encodeURIComponent(matchId)}`);
  return response.match;
}

export async function fetchMyStats(): Promise<{ user: AuthUser; stats: UserStatsView | null }> {
  return apiFetch('/stats/me');
}
