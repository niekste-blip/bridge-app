import { type Auction, type Call, type Hand, isLegalCall } from '../core';
import { type Requirement, handFacts, meets } from './evaluate';
import { callLabel } from './labels';
import { type AuctionView, viewOf } from './view';

export interface BiddingRule {
  readonly id: string;
  readonly lesson: number;
  readonly priority: number;
  readonly call: Call;
  readonly situation: (view: AuctionView) => boolean;
  readonly requires: Requirement;
  readonly explanation: string;
}

export function rule(
  id: string,
  lesson: number,
  priority: number,
  call: Call,
  situation: (view: AuctionView) => boolean,
  requires: Requirement,
  text: string,
): BiddingRule {
  return { id, lesson, priority, call, situation, requires, explanation: `${callLabel(call)}: ${text}` };
}

export function selectRule(
  rules: readonly BiddingRule[],
  hand: Hand,
  auction: Auction,
  maxLesson = Infinity,
): BiddingRule | null {
  const view = viewOf(auction);
  const facts = handFacts(hand);
  let best: BiddingRule | null = null;
  for (const candidate of rules) {
    if (candidate.lesson > maxLesson) continue;
    if (best && candidate.priority <= best.priority) continue;
    if (!candidate.situation(view)) continue;
    if (!meets(facts, candidate.requires)) continue;
    if (!isLegalCall(auction, candidate.call)) continue;
    best = candidate;
  }
  return best;
}
