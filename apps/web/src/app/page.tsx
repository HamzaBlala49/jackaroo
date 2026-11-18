import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  Crown,
  KeyRound,
  Layers3,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UsersRound,
} from 'lucide-react';
import type { Card, PlayerCount } from '@jackaroo/game-types';
import { SiteHeader } from '@/components/site-header';
import { BoardPreview } from '@/components/board/board-preview';
import { PlayingCard } from '@/components/game/playing-card';
import { Reveal } from '@/components/marketing/reveal';
import { SeatDiagram } from '@/components/marketing/seat-diagram';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPlayerCountMeta, getTeamCount } from '@jackaroo/game-config';

const RULE_CARDS: Array<{ card: Card; title: string; text: string }> = [
  {
    card: { id: 'As', rank: 'A', suit: 'spades' },
    title: 'Ace & King',
    text: 'Bring a marble onto the board, or take the long road forward.',
  },
  {
    card: { id: 'Qh', rank: 'Q', suit: 'hearts' },
    title: 'The court moves',
    text: 'Queen flies 12. Jack trades places. Ten, nine, eight march on.',
  },
  {
    card: { id: '7s', rank: '7', suit: 'spades' },
    title: 'Seven, split',
    text: 'Seven steps, shared across your marbles — one careful segment at a time.',
  },
  {
    card: { id: '4d', rank: '4', suit: 'diamonds' },
    title: 'Four, backward',
    text: 'A tactical retreat along the ring. Captures still count.',
  },
];

const PLAYER_COUNTS: PlayerCount[] = [4, 6, 8];

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <SiteHeader />

      <main>
        {/* hero */}
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-[-28rem] h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,179,106,0.12),transparent_62%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_30%,rgba(20,74,60,0.16),transparent_55%)]" />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
            <div className="absolute left-10 top-24 hidden size-2 rotate-45 border border-gold/30 lg:block" />
            <div className="absolute right-16 top-52 hidden size-2 rotate-45 border border-gold/20 lg:block" />
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:px-8 lg:pb-24 lg:pt-16">
            <Reveal className="max-w-2xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-gold/20 bg-card/45 px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-gold backdrop-blur">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-50" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-gold" />
                </span>
                Private tables · live multiplayer
              </div>

              <h1 className="mt-7 font-display text-[3.35rem] font-medium leading-[0.94] tracking-[-0.035em] sm:text-[4.4rem] lg:text-[5rem] xl:text-[5.6rem]">
                Gather your
                <br />
                friends. Race
                <br />
                your marbles{' '}
                <span className="gold-text italic">home.</span>
              </h1>

              <p className="mt-7 max-w-lg text-[0.98rem] leading-relaxed text-muted-foreground sm:text-base">
                Jackaroo is the board game night you can keep. Open a private room, split
                into teams, and send all eight of your marbles around the ring before
                anyone else. No bots. No solo mode. Just the people you invited.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/play">
                    Play now
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/rules">
                    <BookOpen />
                    Read the rulebook
                  </Link>
                </Button>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <UsersRound className="size-3.5 text-gold" /> 4 · 6 · 8 players
                </span>
                <span className="hidden size-1 rotate-45 border border-gold/40 sm:block" />
                <span className="flex items-center gap-1.5">
                  <LockKeyhole className="size-3.5 text-gold" /> Private room codes
                </span>
                <span className="hidden size-1 rotate-45 border border-gold/40 sm:block" />
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-gold" /> Server-validated
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.12} className="relative">
              <div className="relative mx-auto w-full max-w-[660px]">
                <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle_at_55%_45%,rgba(216,179,106,0.16),transparent_68%)] blur-2xl" />
                <BoardPreview playerCount={4} />
                <div className="absolute -bottom-2 left-[8%] hidden items-center gap-2 rounded-full border border-white/10 bg-[#051611]/85 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-cream/55 shadow-xl backdrop-blur sm:flex">
                  <Sparkles className="size-3 text-gold" />
                  House rules v1
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* strip */}
        <section className="relative border-y border-border/50 bg-card/25">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-5 text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground sm:justify-between sm:px-6 lg:px-8">
            {[
              '4 · 6 · 8 seats',
              'teammates opposite',
              'server-owned deck',
              'reconnect mid-match',
              'no bots, ever',
            ].map((item, index) => (
              <span key={item} className="flex items-center gap-6">
                {item}
                {index < 4 ? <span className="hidden size-1 rotate-45 bg-gold/40 sm:block" /> : null}
              </span>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section id="how-to-play" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <Reveal>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">How the evening unfolds</p>
              <h2 className="mt-4 font-display text-4xl font-medium leading-[1.02] tracking-tight sm:text-5xl">
                Simple to learn.
                <br />
                <span className="italic text-muted-foreground">Deliciously tense.</span>
              </h2>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
                A shared ring, four private marbles, one team on the opposite side of the
                table. The whole game is four cards, a little arithmetic, and the
                exquisite risk of leaving a marble where it can be taken.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full border border-gold/25 bg-gold/8 text-gold">
                  <Crown className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">Win as a pair</p>
                  <p className="text-xs text-muted-foreground">All eight team marbles must reach home.</p>
                </div>
              </div>
            </Reveal>

            <div className="space-y-3">
              {[
                {
                  number: '01',
                  icon: <KeyRound />,
                  title: 'Open a private table',
                  text: 'Choose 4, 6 or 8 seats. Share the six-character code with your friends. Everyone gets a seat and a team — no lobby roulette.',
                },
                {
                  number: '02',
                  icon: <Swords />,
                  title: 'Play the hand you are dealt',
                  text: 'Four cards per round. Aces and Kings bring marbles in; the court sends them around. The server owns every shuffle and checks every step.',
                },
                {
                  number: '03',
                  icon: <Trophy />,
                  title: 'Bring the whole team home',
                  text: 'Marbles need an exact landing in the home lane. When a player finishes, their turns help their teammate. The first team with all eight wins.',
                },
              ].map((step, index) => (
                <Reveal key={step.number} delay={index * 0.06}>
                  <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/45 p-5 transition-colors hover:border-gold/25 hover:bg-card/70 sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="font-display text-3xl font-light italic text-gold/40">{step.number}</span>
                      <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-secondary/50 text-gold [&_svg]:size-4">
                        {step.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-xl font-medium">{step.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                      </div>
                    </div>
                    <div className="absolute -bottom-16 -right-10 size-32 rounded-full border border-gold/10 transition-transform duration-700 group-hover:scale-110" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* player counts */}
        <section className="relative border-y border-border/50 bg-card/20 py-20 lg:py-28">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
            <div className="absolute -left-40 top-1/2 size-96 rounded-full border border-gold/5" />
            <div className="absolute -right-40 top-1/2 size-[30rem] rounded-full border border-gold/5" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">Pick your table</p>
              <h2 className="mt-4 font-display text-4xl font-medium tracking-tight sm:text-5xl">
                A table that fits your crowd.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Two players per team. Teammates are seated diametrically opposite, so the
                board is always balanced — whether you are having a quiet four or a full
                eight.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {PLAYER_COUNTS.map((playerCount, index) => {
                const meta = getPlayerCountMeta(playerCount);
                const teams = getTeamCount(playerCount);
                return (
                  <Reveal key={playerCount} delay={index * 0.07}>
                    <div className="group relative flex h-full flex-col items-center overflow-hidden rounded-3xl border border-border/70 bg-card/50 px-6 py-8 text-center transition-all hover:-translate-y-1 hover:border-gold/30 hover:bg-card/80 hover:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]">
                      <div className="flex items-center gap-3 text-gold/60">
                        <SeatDiagram playerCount={playerCount} />
                      </div>
                      <p className="mt-5 font-display text-5xl font-medium">{playerCount}</p>
                      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                        players · {teams} teams
                      </p>
                      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                        {meta.description}. Teammates opposite and four marbles each.
                      </p>
                      <Button asChild variant="outline" size="sm" className="mt-6 rounded-full">
                        <Link href={`/create?players=${playerCount}`}>
                          Host a {playerCount}-seat table
                          <ArrowRight />
                        </Link>
                      </Button>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* rule cards */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
            <Reveal>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">The deck that runs the night</p>
              <h2 className="mt-4 font-display text-4xl font-medium leading-[1.03] tracking-tight sm:text-5xl">
                Thirteen ranks.
                <br />
                <span className="italic text-muted-foreground">No quiet turns.</span>
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Aces open doors. Kings travel far. Jacks start feuds. A seven asks you
                to think in fractions. Every card is configurable under the hood — the
                house rules you see here are the ones the server enforces.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {RULE_CARDS.map(({ card, title, text }) => (
                  <div key={card.id} className="flex gap-3 rounded-xl border border-border/60 bg-card/35 p-3">
                    <PlayingCard card={card} size="sm" asButton={false} className="shadow-lg" />
                    <div className="min-w-0 pt-0.5">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{title}</p>
                      <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild variant="link" className="mt-6 px-0 text-xs uppercase tracking-[0.16em]">
                <Link href="/rules">
                  See every card and house rule
                  <ArrowRight />
                </Link>
              </Button>
            </Reveal>

            <Reveal delay={0.1} className="relative">
              <div className="relative overflow-hidden rounded-[2rem] border border-gold/20 felt-texture felt-noise p-8 text-cream shadow-[0_50px_120px_-50px_rgba(0,0,0,0.9)] sm:p-10">
                <div className="relative z-10">
                  <Badge variant="felt" className="border-gold/25 text-gold-bright">
                    <Radio className="size-3" /> The house rule
                  </Badge>
                  <h3 className="mt-5 font-display text-3xl leading-tight">
                    Safe starts. Exact homes.
                    <br />
                    <span className="italic text-gold-bright">No lucky escapes.</span>
                  </h3>
                  <ul className="mt-7 space-y-4 text-sm text-cream/65">
                    {[
                      'Start cells and four star cells are protected.',
                      'Land on an opponent on a normal cell and they go back to base.',
                      'Home lanes only accept the exact remaining count.',
                      'The server checks the whole move, not just the destination.',
                    ].map((line) => (
                      <li key={line} className="flex gap-3">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold-bright">
                          <Check className="size-3" />
                        </span>
                        <span className="leading-relaxed">{line}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="gold-rule my-7" />
                  <div className="flex items-center justify-between text-[0.62rem] uppercase tracking-[0.2em] text-cream/45">
                    <span>House rules · v1</span>
                    <span className="text-gold">Reviewed in-app</span>
                  </div>
                </div>
                <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full border border-gold/10" />
                <div className="pointer-events-none absolute -bottom-24 -left-10 size-72 rounded-full border border-gold/10" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* fairness band */}
        <section className="border-y border-border/50 bg-card/20 py-16">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              {
                icon: <ShieldCheck />,
                title: 'Server-authoritative',
                text: 'Every card, path, capture and winner is validated on the server.',
              },
              {
                icon: <Layers3 />,
                title: 'Private hands',
                text: 'You see your cards. Everyone else sees only a count.',
              },
              {
                icon: <Radio />,
                title: 'Real-time, resilient',
                text: 'Refresh or drop signal. Your seat, hand and board come back.',
              },
              {
                icon: <UsersRound />,
                title: 'Built for friends',
                text: 'Private invitation links, no public matchmaking, no drop-in strangers.',
              },
            ].map((feature) => (
              <div key={feature.title} className="flex gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/8 text-gold [&_svg]:size-4">
                  {feature.icon}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em]">{feature.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* final CTA */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] border border-gold/25 bg-[radial-gradient(ellipse_at_20%_0%,rgba(216,179,106,0.18),transparent_58%),linear-gradient(145deg,#0b2f26,#041511)] px-6 py-14 text-center text-cream shadow-[0_60px_140px_-50px_rgba(0,0,0,0.9)] sm:px-12 lg:py-20">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10" />
                <div className="absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10" />
                <div className="absolute left-1/2 top-1/2 size-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              <div className="relative z-10">
                <div className="mx-auto mb-6 flex items-center justify-center gap-2">
                  <span className="size-2 rounded-full bg-[#35b99c]" />
                  <span className="size-2 rounded-full bg-[#e9a23b]" />
                  <span className="size-2 rounded-full bg-[#5b8def]" />
                  <span className="size-2 rounded-full bg-[#df6a8c]" />
                </div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-gold-bright/80">
                  Your table is waiting
                </p>
                <h2 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                  Four marbles.
                  <br />
                  <span className="italic text-gold-bright">Who&apos;s sitting down?</span>
                </h2>
                <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-cream/55">
                  Open a room in seconds. Send one code. Let the group chat do the rest.
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <Button asChild size="lg" className="bg-gold-bright text-ink hover:bg-[#f8e3b8]">
                    <Link href="/play">
                      Play now
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="border-cream/25 text-cream hover:border-gold/50 hover:bg-white/5">
                    <Link href="/rules">Learn the rules</Link>
                  </Button>
                </div>
                <p className="mt-6 text-[0.62rem] uppercase tracking-[0.18em] text-cream/35">
                  No account · No bots · No downloads
                </p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-display text-lg tracking-wide">Jackaroo Online</p>
            <p className="mt-1 text-xs text-muted-foreground">
              A private table for friends. Built with a server-authoritative engine.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link className="transition hover:text-gold" href="/play">Play</Link>
            <Link className="transition hover:text-gold" href="/rules">Rulebook</Link>
            <Link className="transition hover:text-gold" href="/rules#house-rules">House rules</Link>
            <span className="text-muted-foreground/50">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
