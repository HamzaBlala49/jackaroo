export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  /** Stable, unique deck identity, e.g. `As`, `10h`. */
  id: string;
  suit: Suit;
  rank: Rank;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_NAME: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

export const SUIT_COLOR: Record<Suit, 'red' | 'black'> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
};

export const RANK_VALUE: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
};

export const RANK_LABEL: Record<Rank, string> = {
  A: 'Ace',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
};

export function makeCardId(rank: Rank, suit: Suit): string {
  return `${rank}${suit.charAt(0)}`;
}

export function isRedSuit(suit: Suit): boolean {
  return SUIT_COLOR[suit] === 'red';
}

export function cardName(card: Card): string {
  return `${RANK_LABEL[card.rank]} of ${SUIT_NAME[card.suit]}`;
}

/** Sort a hand for stable, pleasant UI grouping: by value, then suit. */
export function compareCards(a: Card, b: Card): number {
  if (RANK_VALUE[a.rank] !== RANK_VALUE[b.rank]) {
    return RANK_VALUE[a.rank] - RANK_VALUE[b.rank];
  }
  return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
}
