'use client';

import Link from 'next/link';
import { LockKeyhole, Radio, Ticket } from 'lucide-react';
import { OnboardingGate } from '@/components/onboarding-gate';
import { SiteHeader } from '@/components/site-header';
import { JoinRoomPanel } from '@/components/lobby/room-forms';
import { Reveal } from '@/components/marketing/reveal';
import { Button } from '@/components/ui/button';

export function JoinRoomClient({ initialCode }: { initialCode: string }) {
  return (
    <OnboardingGate context="Your invitation">
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-[-24rem] size-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,179,106,0.1),transparent_65%)]" />
            <div className="absolute left-1/2 top-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/5" />
          </div>

          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
            <Reveal>
              <Button asChild variant="link" size="sm" className="mb-6 px-0 text-[0.62rem] uppercase tracking-[0.18em]">
                <Link href="/play">← Back to the lobby</Link>
              </Button>
              <div className="text-center">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">
                  You&apos;ve been invited
                </p>
                <h1 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-medium leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
                  The table is expecting you.
                </h1>
                <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Enter the six-character code from your host. Your seat is assigned the
                  moment you arrive — no account setup, no app download.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08} className="mx-auto mt-10 max-w-xl">
              <JoinRoomPanel initialCode={initialCode} />
            </Reveal>

            <Reveal delay={0.14} className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                { icon: <Ticket />, label: 'One code', text: 'Six characters is all you need.' },
                { icon: <LockKeyhole />, label: 'Private', text: 'Nothing public, nothing listed.' },
                { icon: <Radio />, label: 'Live', text: 'Ready as soon as the host starts.' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/60 bg-card/30 p-4 text-center">
                  <span className="mx-auto flex size-8 items-center justify-center rounded-full border border-gold/20 bg-gold/8 text-gold [&_svg]:size-3.5">
                    {item.icon}
                  </span>
                  <p className="mt-2 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[0.66rem] leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </main>
      </div>
    </OnboardingGate>
  );
}
