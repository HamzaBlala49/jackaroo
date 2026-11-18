'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface the error for observability tooling without leaking it to users.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </div>
        <p className="mt-7 text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-destructive">
          The table wobbled
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">
          Something interrupted the game.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Your seat, hand and the match itself are safe on the server. Reload the page
          to rejoin exactly where you left off.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            <RotateCcw />
            Try again
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/play">Back to the lobby</Link>
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-6 font-mono text-[0.6rem] text-muted-foreground/50">
            Reference: {error.digest}
          </p>
        ) : null}
      </main>
    </div>
  );
}
