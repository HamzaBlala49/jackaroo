'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CARD_RULE_TEXT,
  CARD_RULE_TITLE,
  DEFAULT_RULES,
  TEAM_PALETTES,
  createPublicRules,
} from '@jackaroo/game-config';
import { RANKS, type Card, type PublicRules } from '@jackaroo/game-types';
import { ArrowUpRight, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { PlayingCard } from '@/components/game/playing-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const SAMPLE_SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;

function cardForRank(rank: (typeof RANKS)[number], index: number): Card {
  const suit = SAMPLE_SUITS[index % SAMPLE_SUITS.length]!;
  return { id: `${rank}${suit.charAt(0)}`, rank, suit };
}

export function Rulebook({
  rules: providedRules,
  compact = false,
  className,
}: {
  rules?: PublicRules;
  compact?: boolean;
  className?: string;
}) {
  const rules = React.useMemo(
    () => providedRules ?? createPublicRules(DEFAULT_RULES),
    [providedRules],
  );

  return (
    <Tabs defaultValue="cards" className={cn('w-full', className)}>
      <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
        <TabsTrigger value="cards">The cards</TabsTrigger>
        <TabsTrigger value="table">Table rules</TabsTrigger>
        <TabsTrigger value="teams">Teams & winning</TabsTrigger>
      </TabsList>

      <TabsContent value="cards" className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-xs leading-relaxed text-muted-foreground">
          Standard {rules.deckSize}-card deck, no jokers. Each round you receive{' '}
          {rules.cardsPerPlayer} cards. The <span className="text-gold">server</span> shuffles,
          deals and owns every card.
        </div>
        <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
          {rules.cardRules.map((cardRule, index) => (
            <div
              key={cardRule.rank}
              className="flex gap-3 rounded-xl border border-border/55 bg-card/45 p-3"
            >
              <PlayingCard
                card={cardForRank(cardRule.rank, index)}
                size="sm"
                asButton={false}
                className="shadow-md"
              />
              <div className="min-w-0">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-gold">
                  {CARD_RULE_TITLE[cardRule.rank]} · {cardRule.rank}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {CARD_RULE_TEXT[cardRule.rank]}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
          Aces and Kings can also bring a marble in from base. A 4 is the only backward
          move. A Jack trades places instead of moving. A 7 opens the split-step panel.
        </p>
      </TabsContent>

      <TabsContent value="table" className="space-y-3">
        <RulePoint
          icon={<Sparkles />}
          title="A full lap, then home"
          text={`The shared ring has ${rules.ringLength} cells. Every player has a protected start and a private ${rules.homeLaneLength}-slot home lane. Enter home exactly — no overshooting.`}
        />
        <RulePoint
          icon={<ShieldCheck />}
          title="Safe starts and stars"
          text={`All start cells, every home-lane slot and the extra star cells (${rules.safePositions.join(', ')}) are protected. Opponents can share those cells but cannot capture there.`}
        />
        <RulePoint
          icon={<UsersRound />}
          title="Stacks, captures, discards"
          text="Multiple marbles may share a cell. Landing on an unprotected opponent sends every opposing marble on that cell back to base. If you have no legal move with any card, you must discard one and pass."
        />
        <RulePoint
          icon={<Sparkles />}
          title="No drifting off the table"
          text={`Every player gets exactly ${rules.marblesPerPlayer} marbles. Cards are played one per turn. A 7 may use up to its full split and can end early. The 4 moves backward only on the main ring.`}
        />
        <div className="grid grid-cols-2 gap-2">
          <ConfigFact label="Team assistance" value={rules.allowTeamAssistance ? 'On' : 'Off'} />
          <ConfigFact label="Exact home" value={rules.exactHomeEntry ? 'Required' : 'Off'} />
          <ConfigFact label="Marbles each" value={String(rules.marblesPerPlayer)} />
          <ConfigFact label="Teams of" value={String(rules.playersPerTeam)} />
        </div>
        <p className="rounded-xl border border-gold/20 bg-gold/5 p-3 text-[0.68rem] leading-relaxed text-muted-foreground">
          House rules v1 is the reviewed default. Jackaroo has regional variations;
          this table spells its own rules out before and during every match so nobody
          has to guess.
        </p>
      </TabsContent>

      <TabsContent value="teams" className="space-y-3">
        <RulePoint
          icon={<UsersRound />}
          title="Two to a team"
          text="Seats alternate between teams. Teammates sit diametrically opposite each other, so every team is distributed evenly around the board. All four team colors are shown beside each player."
        />
        <RulePoint
          icon={<ShieldCheck />}
          title="Finish, then help"
          text="A player finishes when all their marbles are home. On later turns they use their own hand to move their teammate's remaining marbles — including bringing one out of base. The team wins the moment all eight team marbles are home."
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {TEAM_PALETTES.slice(0, 4).map((team) => (
            <div
              key={team.id}
              className="flex items-center gap-2.5 rounded-xl border border-border/55 bg-card/35 px-3 py-2.5"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: team.primary, boxShadow: `0 0 10px ${team.glow}` }}
              />
              <span className="text-xs font-medium">{team.name}</span>
              <span className="ml-auto text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
                Team {team.id + 1}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border/60 bg-background/20 p-4">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-gold">Supported tables</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {rules.playerCounts.join(', ')} players. Two players per team, four marbles
            apiece. Multiplayer only — no bots, no pass-and-play, no offline match.
          </p>
        </div>
        <Link
          href="/rules"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold transition hover:text-gold-bright"
        >
          Full rulebook
          <ArrowUpRight className="size-3.5" />
        </Link>
      </TabsContent>
    </Tabs>
  );
}

function RulePoint({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/55 bg-card/35 p-4">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/8 text-gold [&_svg]:size-3.5">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function ConfigFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/25 px-3 py-2.5">
      <p className="text-[0.52rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
