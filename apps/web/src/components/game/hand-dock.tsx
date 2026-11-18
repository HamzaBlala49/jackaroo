'use client';

import * as React from 'react';
import {
  ArrowRight,
  ChevronsRight,
  CircleOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  Split,
  X,
} from 'lucide-react';
import { cardName, RANK_LABEL, type LegalAction } from '@jackaroo/game-types';
import { PlayingCard } from './playing-card';
import type { useGameInteraction } from './use-game-interaction';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Interaction = ReturnType<typeof useGameInteraction>;

const FAN_CLASSES: Record<number, string[]> = {
  1: ['lg:rotate-0'],
  2: ['lg:-rotate-3', 'lg:rotate-3'],
  3: ['lg:-rotate-5', 'lg:rotate-0', 'lg:rotate-5'],
  4: ['lg:-rotate-6 lg:translate-y-1', 'lg:-rotate-2', 'lg:rotate-2', 'lg:rotate-6 lg:translate-y-1'],
};

export function HandDock({ interaction, locked = false }: { interaction: Interaction; locked?: boolean }) {
  const {
    snapshot,
    hand,
    isMyTurn,
    phase,
    inSeven,
    selectedCard,
    selectedCardId,
    forcedDiscard,
    pending,
    focusedActions,
  } = interaction;

  const mySeven = inSeven && isMyTurn;
  const cardsLocked = locked || !isMyTurn || phase !== 'awaiting-card' || pending;
  const rotate = FAN_CLASSES[hand.length] ?? [];

  return (
    <section className="relative mx-auto w-full max-w-[74rem] shrink-0 px-2 pb-2 sm:px-4 sm:pb-3">
      <div className="relative overflow-hidden rounded-2xl border border-gold/15 bg-[linear-gradient(180deg,rgba(11,40,32,0.94),rgba(4,18,14,0.97))] p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur sm:p-4">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border',
                interaction.prompt.tone === 'danger'
                  ? 'border-rose-400/25 bg-rose-400/10 text-rose-300'
                  : interaction.prompt.tone === 'waiting'
                    ? 'border-white/10 bg-white/[0.03] text-cream/30'
                    : 'border-gold/25 bg-gold/10 text-gold',
              )}
            >
              {interaction.prompt.tone === 'danger' ? (
                <CircleOff className="size-3.5" />
              ) : interaction.prompt.tone === 'waiting' ? (
                <span className="flex gap-0.5">
                  <span className="size-1 animate-pulse rounded-full bg-current" />
                  <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                  <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                </span>
              ) : mySeven ? (
                <Split className="size-3.5" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  'font-display text-sm sm:text-base',
                  interaction.prompt.tone === 'danger'
                    ? 'text-rose-200'
                    : interaction.prompt.tone === 'waiting'
                      ? 'text-cream/55'
                      : 'text-cream',
                )}
              >
                {interaction.prompt.title}
              </p>
              <p className="mt-0.5 text-[0.62rem] leading-relaxed text-cream/35 sm:text-[0.68rem]">
                {interaction.prompt.detail}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {mySeven ? <SevenPips interaction={interaction} /> : null}
            <span className="hidden items-center gap-1 rounded-full border border-white/8 bg-black/15 px-2 py-1 text-[0.5rem] uppercase tracking-[0.12em] text-cream/25 sm:flex">
              <ShieldCheck className="size-2.5 text-gold/50" />
              Server checked
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-2.5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 items-end justify-center gap-1.5 pt-1 sm:gap-2.5 lg:pl-2">
            {hand.length === 0 ? (
              <div className="flex h-[6rem] items-center text-xs text-cream/25">No cards in hand.</div>
            ) : (
              hand.map((card, index) => {
                const cardActions = interaction.you?.legalCards.find((entry) => entry.cardId === card.id)?.actions ?? [];
                const playable = isMyTurn && cardActions.length > 0;
                const isSelected = selectedCardId === card.id;
                return (
                  <div
                    key={card.id}
                    className={cn(
                      'relative transition-transform duration-500',
                      rotate[index] ?? '',
                      isSelected && 'z-20 lg:translate-y-[-0.35rem] lg:rotate-0',
                      !cardsLocked && !playable && !forcedDiscard && 'opacity-65',
                    )}
                  >
                    <PlayingCard
                      card={card}
                      selected={isSelected}
                      disabled={cardsLocked}
                      playable={playable}
                      onClick={() => interaction.selectCard(card)}
                      label={`${card.rank} of ${card.suit}${playable ? ', has a legal move' : ''}`}
                    />
                    <span className="mt-1 hidden text-center text-[0.45rem] uppercase tracking-[0.12em] text-cream/20 sm:block">
                      {card.suit}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div
            className={cn(
              'min-h-[5.2rem] w-full rounded-xl border border-white/[0.06] bg-black/15 p-2.5 lg:w-[22rem]',
              !isMyTurn && !mySeven && 'hidden sm:block',
            )}
          >
            <ActionControls interaction={interaction} locked={locked} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionControls({ interaction, locked }: { interaction: Interaction; locked: boolean }) {
  const {
    isMyTurn,
    phase,
    inSeven,
    selectedCard,
    selectedActions,
    forcedDiscard,
    focusedActions,
    swapSourceMarbleId,
    pending,
    sevenMarbleId,
    sevenOptions,
    sevenSteps,
    sevenMax,
    seven,
    sevenSegments,
    currentPlayer,
    setSevenSteps,
    setHoveredAction,
    startSeven,
    confirmSeven,
    endSeven,
    discardSelected,
    cancelSelection,
    playAction,
  } = interaction;

  const mySeven = isMyTurn && inSeven;

  if (locked) {
    return (
      <div className="flex h-full min-h-[3.6rem] flex-col items-center justify-center gap-1.5 text-center text-[0.62rem] text-amber-200/70">
        <span className="flex gap-1">
          <span className="size-1 animate-pulse rounded-full bg-current" />
          <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
          <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
        </span>
        Reconnecting to the table — actions are paused.
      </div>
    );
  }

  if (pending) {
    return (
      <div className="flex h-full min-h-[3.6rem] items-center justify-center gap-2 text-xs text-cream/40">
        <Loader2 className="size-4 animate-spin text-gold" />
        Waiting for the table to confirm…
      </div>
    );
  }

  if (!isMyTurn && !mySeven) {
    return (
      <div className="flex h-full min-h-[3.6rem] flex-col justify-center px-1 text-center">
        <p className="text-[0.6rem] uppercase tracking-[0.14em] text-cream/25">
          {currentPlayer ? `${currentPlayer.name} has the turn` : 'Waiting for the table'}
        </p>
        <p className="mt-1 text-[0.62rem] text-cream/20">Your cards stay visible. Your moves stay private.</p>
      </div>
    );
  }

  if (mySeven) {
    const used = sevenSegments.reduce((total, segment) => total + segment.steps, 0);
    const remaining = seven?.remaining ?? 0;
    const optionsLeft = sevenOptions.length > 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-gold">
            Split steps
          </p>
          <p className="text-[0.55rem] text-cream/35">{remaining} left · {used} used</p>
        </div>
        {sevenMarbleId ? (
          <>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: sevenMax }, (_, index) => index + 1).map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setSevenSteps(step)}
                  aria-pressed={sevenSteps === step}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full border text-[0.6rem] transition',
                    sevenSteps === step
                      ? 'border-gold bg-gold text-ink'
                      : 'border-white/10 bg-white/[0.03] text-cream/45 hover:border-gold/30',
                  )}
                >
                  {step}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" className="flex-1 gap-1" onClick={() => void confirmSeven()}>
                Move {sevenSteps} <ChevronsRight />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/12 px-2 text-cream/55 hover:bg-white/5"
                onClick={cancelSelection}
                aria-label="Change marble"
              >
                <X />
              </Button>
            </div>
          </>
        ) : optionsLeft ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-center text-[0.62rem] text-cream/35">
            Choose a highlighted marble on the board.
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-center text-[0.62rem] text-cream/35">
            No more legal steps. End the split to pass the turn.
          </p>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={sevenSegments.length === 0}
          onClick={() => void endSeven()}
        >
          End turn{remaining > 0 ? ` · forfeit ${remaining}` : ''}
        </Button>
      </div>
    );
  }

  if (phase !== 'awaiting-card') {
    return (
      <div className="flex h-full items-center justify-center text-[0.62rem] text-cream/25">
        The table is resolving the move…
      </div>
    );
  }

  if (forcedDiscard) {
    return (
      <div className="space-y-2">
        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-rose-300/80">
          Forced discard
        </p>
        {selectedCard ? (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => void discardSelected()}
          >
            Discard {RANK_LABEL[selectedCard.rank]} & pass
          </Button>
        ) : (
          <p className="rounded-lg border border-dashed border-rose-300/15 px-3 py-2 text-center text-[0.62rem] text-cream/35">
            Select a card above. There is no legal move this turn.
          </p>
        )}
      </div>
    );
  }

  if (!selectedCard) {
    const playableCount = interaction.you?.legalCards.filter((entry) => entry.actions.length > 0).length ?? 0;
    return (
      <div className="flex h-full min-h-[3.6rem] flex-col justify-center px-1">
        <p className="text-[0.6rem] font-medium text-cream/45">
          {playableCount > 0
            ? `${playableCount} ${playableCount === 1 ? 'card has' : 'cards have'} a legal move`
            : 'Choose a card when it is your turn'}
        </p>
        <p className="mt-1 text-[0.6rem] leading-relaxed text-cream/22">
          Highlighted marbles and base sockets will show every move the server will allow.
        </p>
      </div>
    );
  }

  if (selectedCard.rank === '7') {
    return (
      <div className="space-y-2">
        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-gold">
          Seven of a kind of trouble
        </p>
        <p className="text-[0.62rem] leading-relaxed text-cream/35">
          Start the split, then distribute up to seven steps across one or more marbles.
        </p>
        <Button size="sm" className="w-full gap-1.5" onClick={() => void startSeven()}>
          <Split className="size-3.5" />
          Start split
        </Button>
      </div>
    );
  }

  if (swapSourceMarbleId) {
    return (
      <div className="space-y-2">
        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-gold">
          Jack swap
        </p>
        <p className="rounded-lg border border-dashed border-gold/20 bg-gold/5 px-3 py-2 text-center text-[0.62rem] text-cream/45">
          Choose a highlighted opponent marble on the board.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full border-white/12 text-cream/55 hover:bg-white/5"
          onClick={cancelSelection}
        >
          Change your marble
        </Button>
      </div>
    );
  }

  const meaningfulActions = focusedActions.filter(
    (action): action is Extract<LegalAction, { kind: 'move' | 'enter' | 'swap' }> =>
      action.kind === 'move' || action.kind === 'enter' || action.kind === 'swap',
  );

  if (meaningfulActions.length > 1) {
    return (
      <div className="space-y-2">
        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-gold">
          Choose the distance
        </p>
        <div className="flex flex-wrap gap-1.5">
          {meaningfulActions.map((action) => (
            <Button
              key={`${action.kind}-${action.marbleId}-${action.kind === 'move' ? action.steps : action.kind === 'swap' ? action.targetMarbleId : 'enter'}`}
              size="sm"
              variant="secondary"
              className="gap-1"
              onMouseEnter={() => setHoveredAction(action)}
              onMouseLeave={() => setHoveredAction(null)}
              onFocus={() => setHoveredAction(action)}
              onBlur={() => setHoveredAction(null)}
              onClick={() => void playAction(action)}
            >
              {action.kind === 'move'
                ? action.direction === 'backward'
                  ? `Back ${action.steps}`
                  : `Move ${action.steps}`
                : action.kind === 'enter'
                  ? 'Enter board'
                  : 'Swap'}
              <ArrowRight className="size-3" />
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-gold/80">
        {cardName(selectedCard)}
      </p>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.62rem] leading-relaxed text-cream/35">
          {selectedActions.some((action) => action.kind === 'enter')
            ? 'Choose a highlighted marble in base, or another highlighted marble to move.'
            : selectedActions.some((action) => action.kind === 'swap')
              ? 'Choose one of your highlighted marbles to set up the swap.'
              : 'Choose a highlighted marble on the board.'}
        </p>
        <button
          type="button"
          onClick={cancelSelection}
          className="shrink-0 rounded-full border border-white/8 p-1 text-cream/25 transition hover:border-white/15 hover:text-cream/60"
          aria-label="Cancel card selection"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}

function SevenPips({ interaction }: { interaction: Interaction }) {
  const used = interaction.sevenSegments.reduce((total, segment) => total + segment.steps, 0);
  const remaining = interaction.seven?.remaining ?? 0;
  const total = used + remaining;
  return (
    <div className="flex items-center gap-1 rounded-full border border-gold/15 bg-gold/5 px-2 py-1">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            'size-1.5 rounded-full transition-colors',
            index < remaining ? 'bg-gold' : 'bg-white/10',
          )}
        />
      ))}
      <span className="ml-1 text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-gold/70">
        {remaining}
      </span>
    </div>
  );
}
