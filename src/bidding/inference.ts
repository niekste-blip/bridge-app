import { type Auction, SUITS, type Seat, type Suit, callerAt, sameCall } from '../core';
import { type BiddingRule } from './rule';
import { viewOf } from './view';

export interface Shown {
  readonly minHcp: number;
  readonly maxHcp: number;
  readonly minLength: Readonly<Record<Suit, number>>;
}

export function shownBy(
  rules: readonly BiddingRule[],
  auction: Auction,
  seat: Seat,
  maxLesson = Infinity,
): Shown {
  let minHcp = 0;
  let maxHcp = 40;
  const minLength: Record<Suit, number> = { C: 0, D: 0, H: 0, S: 0 };

  auction.calls.forEach((call, index) => {
    if (callerAt(auction, index) !== seat) return;
    const before = viewOf({ dealer: auction.dealer, calls: auction.calls.slice(0, index) });
    const meanings = rules.filter(
      (rule) => rule.lesson <= maxLesson && sameCall(rule.call, call) && rule.situation(before),
    );
    if (meanings.length === 0) return;

    minHcp = Math.max(minHcp, Math.min(...meanings.map((rule) => rule.requires.hcp?.[0] ?? 0)));
    maxHcp = Math.min(maxHcp, Math.max(...meanings.map((rule) => rule.requires.hcp?.[1] ?? 40)));
    for (const suit of SUITS) {
      const promised = Math.min(...meanings.map((rule) => rule.requires.lengths?.[suit]?.[0] ?? 0));
      minLength[suit] = Math.max(minLength[suit], promised);
    }
  });

  return { minHcp, maxHcp, minLength };
}
