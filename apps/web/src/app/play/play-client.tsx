'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BarChart3, Clock3, Flag, Sparkles, Swords, Trophy } from 'lucide-react';
import { OnboardingGate } from '@/components/onboarding-gate';
import { SiteHeader } from '@/components/site-header';
import { CreateRoomPanel, JoinRoomPanel } from '@/components/lobby/room-forms';
import { Reveal } from '@/components/marketing/reveal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-provider';
import { fetchMyStats } from '@/lib/api';
import { formatDuration, formatNumber } from '@/lib/utils';

export function PlayClient() {
  return (
    <OnboardingGate context="Your seat">
      <PlayContent />
    </OnboardingGate>
  );
}

function PlayContent() {
  const { user } = useAuth();
  const statsQuery = useQuery({
    queryKey: ['my-stats'],
    queryFn: fetchMyStats,
    enabled: Boolean(user),
    retry: false,
  });
  const stats = statsQuery.data?.stats;
  const winRate =
    stats && stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-22rem] size-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,179,106,0.1),transparent_62%)]" />
          <div className="absolute left-1/2 top-1/2 size-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/5" />
          <div className="absolute left-1/2 top-1/2 size-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/5" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">
                  The lobby
                </p>
                <h1 className="mt-3 font-display text-4xl font-medium leading-[1.02] tracking-tight sm:text-5xl">
                  Pull up a chair
                  {user ? (
                    <>
                      , <span className="italic gold-text">{user.displayName.split(' ')[0]}</span>.
                    </>
                  ) : (
                    '.'
                  )}
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Open a private table or slip into one with a code. Your seat, hand and
                  record are kept for as long as this browser session lives.
                </p>
              </div>
              <Badge variant="outline" className="w-fit gap-2 border-gold/25 px-3 py-1.5 text-gold">
                <Sparkles className="size-3" />
                House rules v1
              </Badge>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
            <Reveal delay={0.05}>
              <CreateRoomPanel />
            </Reveal>
            <Reveal delay={0.1}>
              <JoinRoomPanel />
            </Reveal>
          </div>

          <Reveal delay={0.15} className="mt-4">
            <div className="rounded-3xl border border-border/60 bg-card/35 p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full border border-gold/20 bg-gold/8 text-gold">
                    <BarChart3 className="size-4" />
                  </span>
                  <div>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-gold">
                      Your table record
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stats && stats.gamesPlayed > 0
                        ? `${stats.gamesPlayed} matches played · ${winRate}% wins`
                        : 'Every record starts with the first shuffle.'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/rules"
                  className="inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground transition hover:text-gold"
                >
                  Review the rulebook
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatBlock icon={<Swords />} label="Moves" value={formatNumber(stats?.moves ?? 0)} />
                <StatBlock icon={<Trophy />} label="Wins" value={formatNumber(stats?.gamesWon ?? 0)} />
                <StatBlock icon={<Flag />} label="Captures" value={formatNumber(stats?.captures ?? 0)} />
                <StatBlock
                  icon={<Clock3 />}
                  label="At the table"
                  value={formatDuration(stats?.totalPlaySeconds ?? 0)}
                />
              </div>
            </div>
          </Reveal>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-[0.65rem] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Private rooms only. No public matchmaking yet.
            </span>
            <Button asChild variant="link" size="sm" className="px-0 text-[0.65rem] uppercase tracking-[0.14em]">
              <Link href="/">Back to the landing page</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/55 bg-background/25 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground [&_svg]:size-3 [&_svg]:text-gold/70">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 font-display text-2xl font-medium leading-none">{value}</p>
    </div>
  );
}
