import { RANKS, SUITS, makeCardId, type Card } from '@jackaroo/game-types';
import { createSeededRng, shuffled } from '@jackaroo/shared-utils';

export function createStandardDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: makeCardId(rank, suit), suit, rank });
    }
  }
  return cards;
}

export function createShuffledDeck(seed: string): Card[] {
  return shuffled(createStandardDeck(), createSeededRng(seed));
}
