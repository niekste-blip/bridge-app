import { SUITS, type Suit } from '../../core';

export function isMajor(suit: Suit): boolean {
  return suit === 'H' || suit === 'S';
}

export function suitsAbove(suit: Suit): Suit[] {
  return SUITS.filter((other) => SUITS.indexOf(other) > SUITS.indexOf(suit));
}

export function suitsBelow(suit: Suit): Suit[] {
  return SUITS.filter((other) => SUITS.indexOf(other) < SUITS.indexOf(suit));
}

export function minLengths(
  suits: readonly Suit[],
  min: (suit: Suit) => number,
): Partial<Record<Suit, number>> {
  const result: Partial<Record<Suit, number>> = {};
  for (const suit of suits) result[suit] = min(suit);
  return result;
}
