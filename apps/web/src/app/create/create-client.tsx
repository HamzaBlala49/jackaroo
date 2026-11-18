'use client';

import Link from 'next/link';
import { Check, KeyRound, ShieldCheck, UsersRound } from 'lucide-react';
import type { PlayerCount } from '@jackaroo/game-types';
import { OnboardingGate } from '@/components/onboarding-gate';
import { SiteHeader } from '@/components/site-header';
import { CreateRoomPanel } from '@/components/lobby/room-forms';
import { RulesDialog } from '@/components/rules/rules-dialog';
import { Reveal } from '@/components/marketing/reveal';
import { Button } from '@/components/ui/button';

export function CreateRoomClient({ initialPlayers }: { initialPlayers: PlayerCount }) {
  return (
    <OnboardingGate context="Host a table">
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute right-[-18rem] top-[-16rem] size-[44rem] rounded-full bg-[radial-gradient(circle,rgba(216,179,106,0.1),transparent_65%)]" />
            <div className="absolute left-[-14rem] bottom-[-20rem] size-[36rem] rounded-full border border-gold/5" />
          </div>

          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <Reveal>
              <Button asChild variant="link" size="sm" className="mb-6 px-0 text-[0.62rem] uppercase tracking-[0.18em]">
                <Link href="/play">← Back to the lobby</Link>
              </Button>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">
                Create a private room
              </p>
              <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
                Set the table.
                <br />
                <span className="italic text-muted-foreground">We&apos;ll bring the board.</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Pick your seat count. A six-character code and invitation link will be
                ready the moment the room opens. Teams are assigned automatically.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Reveal delay={0.05}>
                <CreateRoomPanel initialPlayers={initialPlayers} />
              </Reveal>
              <Reveal delay={0.1} className="space-y-4">
                <div className="rounded-3xl border border-border/60 bg-card/35 p-6">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-gold">
                    Before the first card
                  </p>
                  <ul className="mt-5 space-y-4">
                    {[
                      {
                        icon: <UsersRound />,
                        title: 'Every seat must fill',
                        text: 'The start button unlocks only when all seats are taken and everyone is connected.',
                      },
                      {
                        icon: <Check />,
                        title: 'Everyone presses ready',
                        text: 'You can share the link first, settle teams, and start when the table is ready.',
                      },
                      {
                        icon: <KeyRound />,
                        title: 'Share one code',
                        text: 'The invitation opens the waiting room and seats your friend automatically.',
                      },
                      {
                        icon: <ShieldCheck />,
                        title: 'The server deals',
                        text: 'Hands stay private. Every shuffle, move and winner is decided server-side.',
                      },
                    ].map((item) => (
                      <li key={item.title} className="flex gap-3">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/8 text-gold [&_svg]:size-3.5">
                          {item.icon}
                        </span>
                        <div>
                          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em]">{item.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="gold-rule my-5" />
                  <RulesDialog
                    trigger={
                      <Button variant="outline" size="sm" className="w-full">
                        Review the house rules
                      </Button>
                    }
                  />
                </div>
                <div className="rounded-2xl border border-gold/15 bg-gold/5 p-4 text-[0.68rem] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-gold">A note on teams.</span> Seats
                  alternate teams, which puts your teammate directly across the board.
                  You do not choose a team; the table stays balanced for everyone.
                </div>
              </Reveal>
            </div>
          </div>
        </main>
      </div>
    </OnboardingGate>
  );
}
