import { auctionFrom, callText, parseHand } from '../core';
import { type BiddingRule, selectRule } from './rule';

// Test helper: the call the rules choose for the seat to call, with North as dealer
export function callFor(
  rules: readonly BiddingRule[],
  handText: string,
  auctionText: string,
  maxLesson = Infinity,
): string {
  const chosen = selectRule(rules, parseHand(handText), auctionFrom('N', auctionText), maxLesson);
  return chosen ? callText(chosen.call) : 'none';
}
