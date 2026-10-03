export const SUITS = ['C', 'D', 'H', 'S'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

const RANK_CHARS = '23456789TJQKA';

export function parseCard(text: string): Card {
  const suit = text[0] as Suit;
  const rankIndex = text.length === 2 ? RANK_CHARS.indexOf(text[1]) : -1;
  if (!SUITS.includes(suit) || rankIndex < 0) {
    throw new Error(`Invalid card: ${text}`);
  }
  return { suit, rank: RANKS[rankIndex] };
}

export function cardId(card: Card): string {
  return card.suit + RANK_CHARS[card.rank - 2];
}

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function fullDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
}

const HONOUR_LABELS: Partial<Record<Rank, string>> = { 11: 'B', 12: 'V', 13: 'H', 14: 'A' };

export function rankLabel(rank: Rank): string {
  return HONOUR_LABELS[rank] ?? String(rank);
}
