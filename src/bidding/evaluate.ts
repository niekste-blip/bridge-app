import { type Hand, SUITS, type Suit, highCardPoints, suitLength } from '../core';

export interface HandFacts {
  readonly hcp: number;
  readonly lengths: Readonly<Record<Suit, number>>;
  readonly balanced: boolean;
}

const BALANCED_SHAPES = ['4333', '4432', '5332'];

export function handFacts(hand: Hand): HandFacts {
  const lengths = {
    S: suitLength(hand, 'S'),
    H: suitLength(hand, 'H'),
    D: suitLength(hand, 'D'),
    C: suitLength(hand, 'C'),
  };
  const shape = SUITS.map((suit) => lengths[suit])
    .sort((a, b) => b - a)
    .join('');
  return { hcp: highCardPoints(hand), lengths, balanced: BALANCED_SHAPES.includes(shape) };
}

export type Range = readonly [min: number, max: number];

export interface Requirement {
  readonly hcp?: Range;
  readonly lengths?: Partial<Record<Suit, Range>>;
  readonly balanced?: boolean;
  readonly also?: (facts: HandFacts) => boolean;
}

function inRange(value: number, range: Range | undefined): boolean {
  return !range || (value >= range[0] && value <= range[1]);
}

export function meets(facts: HandFacts, requirement: Requirement): boolean {
  return (
    inRange(facts.hcp, requirement.hcp) &&
    SUITS.every((suit) => inRange(facts.lengths[suit], requirement.lengths?.[suit])) &&
    (requirement.balanced === undefined || requirement.balanced === facts.balanced) &&
    (!requirement.also || requirement.also(facts))
  );
}

export function points(min: number, max = 40): Range {
  return [min, max];
}

export function lengthOf(suit: Suit, min: number, max = 13): Partial<Record<Suit, Range>> {
  const lengths: Partial<Record<Suit, Range>> = {};
  lengths[suit] = [min, max];
  return lengths;
}

// Longest listed suit that is long enough; on a tie the higher suit with five or more cards, else the lower
export function preferredSuit(
  facts: HandFacts,
  minLengths: Partial<Record<Suit, number>>,
): Suit | null {
  let best: Suit | null = null;
  for (const suit of SUITS) {
    const min = minLengths[suit];
    const length = facts.lengths[suit];
    if (min === undefined || length < min) continue;
    if (
      best === null ||
      length > facts.lengths[best] ||
      (length === facts.lengths[best] && length >= 5)
    ) {
      best = suit;
    }
  }
  return best;
}
