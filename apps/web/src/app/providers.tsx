'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { MotionConfig } from 'motion/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/lib/auth-provider';
import { SocketProvider } from '@/lib/socket-provider';
import { useSettingsStore } from '@/stores/settings-store';

function MotionProvider({ children }: { children: React.ReactNode }) {
  const animationsEnabled = useSettingsStore((state) => state.animationsEnabled);
  return (
    <MotionConfig reducedMotion={animationsEnabled ? 'user' : 'always'}>{children}</MotionConfig>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <AuthProvider>
          <SocketProvider>
            <MotionProvider>
              <TooltipProvider delayDuration={220}>
                {children}
                <Toaster />
              </TooltipProvider>
            </MotionProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
