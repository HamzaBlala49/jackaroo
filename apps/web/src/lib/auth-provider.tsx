'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@jackaroo/game-types';
import {
  fetchMe,
  guestLogin,
  logout as logoutRequest,
  updateDisplayName,
} from '@/lib/api';
import { useRoomStore } from '@/stores/room-store';
import { useGameStore } from '@/stores/game-store';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggingIn: boolean;
  login: (displayName: string) => Promise<AuthUser>;
  updateName: (displayName: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  error: Error | null;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export const ME_QUERY_KEY = ['me'] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: guestLogin,
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateDisplayName,
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: ['match'] });
      useRoomStore.getState().clear();
      useGameStore.getState().clear();
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('jackaroo:lastRoom');
      }
    },
  });

  const value: AuthContextValue = {
    user: query.data ?? null,
    isLoading: query.isPending,
    isLoggingIn: loginMutation.isPending,
    login: async (displayName) => loginMutation.mutateAsync(displayName),
    updateName: async (displayName) => updateMutation.mutateAsync(displayName),
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    error: (query.error as Error | null) ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
