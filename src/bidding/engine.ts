import { type Auction, type Hand, isAuctionComplete, sameCall } from '../core';
import { type Choice, NO_AGREEMENT, fallbackChoice } from './fallback';
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
    return { call: chosen.call, ruleId: chosen.id, explanation: chosen.explanation };
  }
  return fallbackChoice(rules, hand, auction, maxLesson);
}

export function explainCall(auction: Auction, index: number, options: BiddingOptions = {}): string {
  const rules = options.rules ?? ALL_RULES;
  const maxLesson = options.maxLesson ?? Infinity;
  const call = auction.calls[index];
  const before = viewOf({ dealer: auction.dealer, calls: auction.calls.slice(0, index) });
  let best: BiddingRule | null = null;
  for (const candidate of rules) {
    if (candidate.lesson > maxLesson) continue;
    if (best && candidate.priority <= best.priority) continue;
    if (!sameCall(candidate.call, call) || !candidate.situation(before)) continue;
    best = candidate;
  }
  return best ? best.explanation : NO_AGREEMENT;
}
