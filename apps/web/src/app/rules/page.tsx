import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Crown,
  Layers3,
  ShieldCheck,
  Sparkles,
  Split,
  UsersRound,
} from 'lucide-react';
import {
  CARD_RULE_TEXT,
  CARD_RULE_TITLE,
  DEFAULT_RULES,
  PLAYERS_PER_TEAM,
  TEAM_PALETTES,
  createPublicRules,
  getTeamCount,
} from '@jackaroo/game-config';
import { RANKS, type Card } from '@jackaroo/game-types';
import { SiteHeader } from '@/components/site-header';
import { PlayingCard } from '@/components/game/playing-card';
import { BoardPreview } from '@/components/board/board-preview';
import { Rulebook } from '@/components/rules/rulebook';
import { Reveal } from '@/components/marketing/reveal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'The rulebook',
  description:
    'The complete Jackaroo house rules for v1: cards, movement, captures, safe cells, team assistance and winning.',
};

const NAV = [
  { id: 'table', label: 'The table' },
  { id: 'board', label: 'The board' },
  { id: 'cards', label: 'The cards' },
  { id: 'turn', label: 'A turn' },
  { id: 'captures', label: 'Captures & safety' },
  { id: 'rounds', label: 'Rounds & deck' },
  { id: 'teams', label: 'Teams & winning' },
  { id: 'house-rules', label: 'House rules' },
  { id: 'variations', label: 'Regional variations' },
];

const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
const rules = createPublicRules(DEFAULT_RULES);

function rankCard(rank: (typeof RANKS)[number], index: number): Card {
  const suit = SUITS[index % SUITS.length]!;
  return { id: `${rank}${suit.charAt(0)}`, rank, suit };
}

export default function RulesPage() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <SiteHeader />
      <main>
        <section className="relative border-b border-border/50">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-[-24rem] size-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,179,106,0.1),transparent_64%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_20%,rgba(19,72,59,0.12),transparent_55%)]" />
          </div>
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8 lg:py-20">
            <Reveal>
              <Badge variant="outline" className="gap-2 border-gold/25 px-3 py-1.5 text-gold">
                <BookOpen className="size-3" />
                House rules v1
              </Badge>
              <h1 className="mt-6 font-display text-5xl font-medium leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
                The rulebook,
                <br />
                <span className="italic text-muted-foreground">with nothing hidden.</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Jackaroo has regional variations. This is the explicit, reviewed default
                for Jackaroo Online v1 — the exact table your room will enforce. Read it
                before you sit down; the in-game Rules button keeps it one tap away.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {rules.playerCounts.map((count) => (
                  <Badge key={count} variant="secondary" className="px-3 py-1 text-[0.6rem]">
                    {count} players · {getTeamCount(count)} teams
                  </Badge>
                ))}
                <Badge variant="secondary" className="px-3 py-1 text-[0.6rem]">
                  {rules.deckSize} cards
                </Badge>
                <Badge variant="secondary" className="px-3 py-1 text-[0.6rem]">
                  {rules.marblesPerPlayer} marbles each
                </Badge>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/play">
                    Find a table <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="#cards">Jump to the cards</Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="relative mx-auto w-full max-w-md">
                <BoardPreview playerCount={4} />
              </div>
            </Reveal>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[210px_minmax(0,1fr)] xl:gap-20">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-gold">
                  On this page
                </p>
                <nav className="mt-4 space-y-1 border-l border-border/70">
                  {NAV.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="-ml-px block border-l border-transparent py-1.5 pl-4 text-xs text-muted-foreground transition hover:border-gold hover:text-gold"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
                <div className="mt-8 rounded-xl border border-border/60 bg-card/35 p-4">
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-gold">
                    In a match
                  </p>
                  <p className="mt-2 text-[0.68rem] leading-relaxed text-muted-foreground">
                    The Rules button in the table header opens this same summary without
                    leaving your seat.
                  </p>
                </div>
              </div>
            </aside>

            <article className="min-w-0 space-y-16">
              <section id="table" className="scroll-mt-24">
                <SectionTitle
                  icon={<UsersRound />}
                  eyebrow="01 · The table"
                  title="Even seats. Opposite teammates."
                />
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Jackaroo Online is multiplayer only. There is no solo game, no AI and no
                  local pass-and-play. A room supports exactly{' '}
                  {rules.playerCounts.slice(0, -1).join(', ')} or{' '}
                  {rules.playerCounts[rules.playerCounts.length - 1]} players. Every
                  player has {rules.marblesPerPlayer} marbles and every team has{' '}
                  {PLAYERS_PER_TEAM} players.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {rules.playerCounts.map((count) => (
                    <div key={count} className="rounded-2xl border border-border/60 bg-card/35 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-display text-3xl">{count}</p>
                        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">
                          players
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {getTeamCount(count)} teams of {PLAYERS_PER_TEAM}
                      </p>
                      <div className="mt-3 flex gap-1.5">
                        {TEAM_PALETTES.slice(0, getTeamCount(count)).map((team) => (
                          <span
                            key={team.id}
                            className="size-2 rounded-full"
                            style={{ background: team.primary }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Seats alternate teams. Because every team has two players, teammates are
                  always placed diametrically opposite one another. The host cannot start
                  until every seat is filled, every player is connected and every player
                  is ready.
                </p>
              </section>

              <section id="board" className="scroll-mt-24">
                <SectionTitle
                  icon={<Compass />}
                  eyebrow="02 · The board"
                  title="One ring. A private lane for every marble."
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <RuleDetail
                    title="The main ring"
                    text={`The shared ring has ${rules.ringLength} cells. Movement always follows the ring clockwise. A marble enters on its owner's protected start cell and must complete a full lap before it can turn into its private home lane.`}
                  />
                  <RuleDetail
                    title="The home lane"
                    text={`Every player has a private ${rules.homeLaneLength}-slot lane. Home must be entered with an exact remaining count: you may not finish past the final slot. Home-lane marbles can never be captured or swapped.`}
                  />
                  <RuleDetail
                    title="Safe cells"
                    text={`Every start cell, every home slot and the extra star cells (${rules.safePositions.join(
                      ', ',
                    )}) are protected. Opponents can share these cells, but no capture happens there.`}
                  />
                  <RuleDetail
                    title="Stacks"
                    text="Multiple marbles may occupy a cell, including marbles from different teams on protected cells. On an unprotected cell, landing on opponents captures every opposing marble on that cell."
                  />
                </div>
              </section>

              <section id="cards" className="scroll-mt-24">
                <SectionTitle icon={<Layers3 />} eyebrow="03 · The cards" title="A standard 52. Nothing up the server's sleeve." />
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  The server shuffles with a fresh random seed, deals{' '}
                  {rules.cardsPerPlayer} cards to every player and keeps the remaining deck
                  hidden. A client never determines a shuffle, a card order or its own hand.
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {rules.cardRules.map((cardRule, index) => (
                    <div
                      key={cardRule.rank}
                      className="flex gap-3 rounded-xl border border-border/55 bg-card/35 p-3"
                    >
                      <PlayingCard
                        card={rankCard(cardRule.rank, index)}
                        size="sm"
                        asButton={false}
                        className="shadow-md"
                      />
                      <div className="min-w-0">
                        <p className="text-[0.56rem] font-semibold uppercase tracking-[0.16em] text-gold">
                          {CARD_RULE_TITLE[cardRule.rank]} · {cardRule.rank}
                        </p>
                        <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                          {CARD_RULE_TEXT[cardRule.rank]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-5 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-gold">Entry rule.</span> Only an Ace
                  or King may bring a marble out of base. The marble lands directly on its
                  owner&apos;s start cell. The entry consumes the whole card — you do not also
                  move 1, 11 or 13.
                </div>
              </section>

              <section id="turn" className="scroll-mt-24">
                <SectionTitle icon={<Sparkles />} eyebrow="04 · A turn" title="One card, then the table turns." />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <RuleDetail
                    title="Play or forced discard"
                    text="Play exactly one card and end your turn. If at least one card in your hand has a legal action, you must play it; voluntary discards are not allowed. If no card has any legal action, you choose one card to discard face-up and pass."
                  />
                  <RuleDetail
                    title="The seven split"
                    text="Playing a 7 opens a split phase. Distribute up to seven forward steps across one or more eligible marbles, one segment at a time. Each segment must be legal. You may end early and forfeit unused steps."
                  />
                  <RuleDetail
                    title="The four backwards"
                    text="A 4 moves four cells backward along the main ring only. It cannot be used from a home lane, cannot pass before the start, and can capture on its landing cell under the normal rules."
                  />
                  <RuleDetail
                    title="The jack swap"
                    text="A Jack swaps your eligible marble's physical ring cell with an opponent's eligible ring cell. Both cells must be unprotected and both marbles must be on the main ring. A swap never captures and may create a stack."
                  />
                </div>
              </section>

              <section id="captures" className="scroll-mt-24">
                <SectionTitle icon={<ShieldCheck />} eyebrow="05 · Captures & safety" title="Every capture is a decision. Every safe cell is a promise." />
                <div className="mt-5 space-y-3">
                  <NumberedRule number="1" text="Only the landing cell matters. A marble passing over a cell never captures." />
                  <NumberedRule number="2" text="Landing on one or more opposing marbles on an unprotected ring cell sends every opposing marble on that cell back to its owner's base." />
                  <NumberedRule number="3" text="Your own and teammate marbles are never captured. They may share the cell with you." />
                  <NumberedRule number="4" text="Start cells, the extra star cells and all home-lane slots are capture-immune. Landing there is allowed; sharing is allowed." />
                  <NumberedRule number="5" text="Captured marbles reset to base and need a new Ace or King to return." />
                </div>
              </section>

              <section id="rounds" className="scroll-mt-24">
                <SectionTitle icon={<Split />} eyebrow="06 · Rounds & the deck" title="Four cards. Then the table is swept." />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <RuleDetail
                    title="The round"
                    text={`Every player receives ${rules.cardsPerPlayer} cards. The round ends when every player in the rotation has used or discarded all their cards. Players who have emptied their hand are skipped until the next round.`}
                  />
                  <RuleDetail
                    title="The reshuffle"
                    text="All 52 cards — played, discarded and undealt — are returned to the deck, shuffled by the server, and dealt again. The starting seat rotates one seat forward each round."
                  />
                  <RuleDetail
                    title="Deck ownership"
                    text="The server generates the seed, deals the cards and stores the full state. Clients receive only their own hand and public counts."
                  />
                  <RuleDetail
                    title="Round log"
                    text="A round is not restarted if someone disconnects. Reconnect to the same seat and the exact hand you left behind."
                  />
                </div>
              </section>

              <section id="teams" className="scroll-mt-24">
                <SectionTitle icon={<Crown />} eyebrow="07 · Teams & winning" title="Finish your four. Then finish the eight." />
                <div className="mt-5 space-y-3">
                  <NumberedRule number="1" text="A player finishes when all four of their own marbles reach the final home slot." />
                  <NumberedRule number="2" text={`On that player's later turns, they use their own hand to help their teammate — including bringing a teammate's marble out of base. Assistance is ${rules.allowTeamAssistance ? 'on' : 'off'} at this table.`} />
                  <NumberedRule number="3" text="The teammate still takes their own turns normally. Hands are never shared." />
                  <NumberedRule number="4" text="The team wins the instant all eight of its marbles are home. The match ends immediately, even in the middle of a 7 split." />
                  <NumberedRule number="5" text="One winning team, no tie-break. Final statistics are stored to each player's record at the moment the table closes." />
                </div>
              </section>

              <section id="house-rules" className="scroll-mt-24">
                <SectionTitle icon={<BookOpen />} eyebrow="08 · House rules" title="The edge cases, settled out loud." />
                <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
                  {[
                    ['Multi-occupancy', 'Stacks are allowed. Capture removes every opposing marble on the landing cell.'],
                    ['Unused 7 steps', 'Allowed and forfeited when the turn ends. A 7 can move the same marble more than once.'],
                    ['Backward capture', 'A 4 may capture on its landing cell. It cannot be used in a home lane.'],
                    ['Voluntary discard', 'Not allowed while any card in hand has a legal action.'],
                    ['Assistance', 'Begins on the helper\'s next turn; the helper may enter from base.'],
                    ['Reshuffle', 'All 52 cards are reshuffled after a completed round.'],
                    ['Start stacking', 'Entering a start cell is allowed even if other marbles are already there.'],
                    ['Jack', 'Swaps physical ring cells; no capture; stacks allowed.'],
                    ['Turn timer', 'Not enabled in v1. An absent player pauses the match; reconnect to resume.'],
                    ['Spectators', 'Not enabled in v1. Rooms are for seated players only.'],
                  ].map(([title, text], index) => (
                    <div
                      key={title}
                      className="grid gap-1 border-b border-border/50 bg-card/20 px-4 py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-6 sm:px-5"
                    >
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-gold/80">
                        {String(index + 1).padStart(2, '0')} · {title}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="variations" className="scroll-mt-24">
                <SectionTitle icon={<Sparkles />} eyebrow="09 · Regional variations" title="The rules that are intentionally not on this table." />
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Jackaroo differs from region to region. None of the following are silently
                  active in v1; each is isolated behind the shared rules configuration so a
                  future house-rules preset can add it.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {[
                    'Jokers or a larger deck',
                    'Different Ace / face-card values',
                    '5 that lets you move an opponent marble',
                    '7 with backward or arbitrary directions',
                    'Jack that steals instead of swapping',
                    'Home entry with overshoot or bounce',
                    'Shared team hand or consultation',
                    'Turn timers with automatic moves',
                    'Different safe-star maps',
                    'A single-marble win condition',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 rounded-xl border border-border/55 bg-card/25 px-3.5 py-2.5">
                      <span className="size-1 rotate-45 border border-gold/40" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-gold/20 bg-gold/5 p-5">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-gold">
                    This is the contract
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Before joining a match, the default rulebook is available on this page.
                    During a match, the same summary opens from the Rules button. If your
                    group plays a different regional variant, agree it before the first
                    shuffle — this v1 table will always enforce the rules written here.
                  </p>
                </div>
              </section>

              <Separator className="bg-border/60" />

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-display text-2xl">Ready to sit down?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose a table, send one code, and let the room do the rest.
                  </p>
                </div>
                <Button asChild size="lg">
                  <Link href="/play">
                    Play now <ArrowRight />
                  </Link>
                </Button>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/25 p-5 lg:hidden">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-gold">
                  Full rule summary
                </p>
                <div className="mt-4">
                  <Rulebook rules={rules} compact />
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionTitle({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-gold">
        <span className="[&_svg]:size-3.5">{icon}</span>
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function RuleDetail({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/55 bg-card/30 p-5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-foreground">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function NumberedRule({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-xl border border-border/55 bg-card/25 px-4 py-3.5">
      <span className="font-display text-lg italic text-gold/60">{number}</span>
      <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
