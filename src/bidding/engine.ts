import { type Auction, type Hand, isAuctionComplete, sameCall } from '../core';
import { type Choice, fallbackChoice } from './fallback';
import { type BiddingRule, selectRule } from './rule';
import { ALL_RULES } from './rules';
import { viewOf } from './view';

export interface BiddingOptions {
  readonly maxLesson?: number;
  readonly rules?: readonly BiddingRule[];
}

export function chooseCall(hand: Hand, auction: Auction, options: BiddingOptions = {}): Choice {
  if (isAuctionComplete(auction)) {
    throw new Error('Auction is complete');
  }
  const rules = options.rules ?? ALL_RULES;
  const maxLesson = options.maxLesson ?? Infinity;
  const chosen = selectRule(rules, hand, auction, maxLesson);
  if (chosen) {
    return { call: chosen.call, ruleId: chosen.id, explanation: chosen.explanation, source: 'rule' };
  }
  return fallbackChoice(rules, hand, auction, maxLesson);
}

// Every meaning the rules give to the call at this position, most likely first.
// A bot knows which rule it used (Choice.explanation); this is for calls made by anyone.
export function meaningsOf(auction: Auction, index: number, options: BiddingOptions = {}): string[] {
  const rules = options.rules ?? ALL_RULES;
  const maxLesson = options.maxLesson ?? Infinity;
  const call = auction.calls[index];
  if (!call) {
    throw new RangeError(`No call at index ${index}`);
  }
  const before = viewOf({ dealer: auction.dealer, calls: auction.calls.slice(0, index) });
  return rules
    .filter(
      (candidate) =>
        candidate.lesson <= maxLesson &&
        sameCall(candidate.call, call) &&
        candidate.situation(before),
    )
    .sort((a, b) => b.priority - a.priority)
    .map((candidate) => candidate.explanation);
}
