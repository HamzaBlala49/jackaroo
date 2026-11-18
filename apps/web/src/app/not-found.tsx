import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(216,179,106,0.12),transparent_65%)]" />
        <div className="relative flex size-20 items-center justify-center rounded-full border border-gold/25 bg-gold/5 text-gold">
          <Compass className="size-8" />
          <span className="absolute inset-2 rounded-full border border-gold/15" />
        </div>
        <p className="mt-8 text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">
          Off the board
        </p>
        <h1 className="mt-3 font-display text-5xl font-medium tracking-tight">
          This seat doesn&apos;t exist.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          The page you were looking for has wandered off the ring. Head back to the
          lobby and pick a table that is still setting up.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/play">
              Back to the lobby <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
