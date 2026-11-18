'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            '!rounded-xl !border !border-gold/25 !bg-card !text-card-foreground !shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)]',
          title: '!font-medium',
          description: '!text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground',
          cancelButton: '!bg-secondary !text-secondary-foreground',
          success: '!border-emerald-400/30',
          error: '!border-destructive/40',
        },
      }}
    />
  );
}
