import { PASS, type Suit, bid } from '../../core';
import { type HandFacts, lengthOf, points, preferredSuit } from '../evaluate';
import { SUIT_NAME } from '../labels';
import { type BiddingRule, rule } from '../rule';
import { isOpening } from '../view';

export function openingSuit(facts: HandFacts): Suit {
  const longSuit = preferredSuit(facts, { C: 5, D: 5, H: 5, S: 5 });
  if (longSuit) return longSuit;
  return facts.lengths.D >= 4 ? 'D' : 'C';
}

const PROMISED_LENGTH: Readonly<Record<Suit, number>> = { C: 2, D: 4, H: 5, S: 5 };

function openOneOfSuit(suit: Suit): BiddingRule {
  const length = PROMISED_LENGTH[suit];
  return rule(
    `open-1${suit}`,
    4,
    10,
    bid(1, suit),
    isOpening,
    {
      hcp: points(12),
      lengths: lengthOf(suit, length),
      also: (facts) => openingSuit(facts) === suit,
    },
    `vanaf 12 punten en minstens ${length} ${SUIT_NAME[suit]}.`,
  );
}

export const OPENING_RULES: readonly BiddingRule[] = [
  rule(
    'open-1NT',
    5,
    20,
    bid(1, 'NT'),
    isOpening,
    { hcp: points(15, 17), balanced: true },
    '15 tot en met 17 punten en een SA-verdeling.',
  ),
  ...(['S', 'H', 'D', 'C'] as const).map(openOneOfSuit),
  rule(
    'open-pass',
    4,
    1,
    PASS,
    isOpening,
    { hcp: points(0, 11) },
    'minder dan 12 punten, te weinig om te openen.',
  ),
];
