import {
  type Auction,
  type Bid,
  type Call,
  type Hand,
  PASS,
  SUITS,
  bid,
  isLegalCall,
  partnerOf,
} from '../core';
import { handFacts } from './evaluate';
import { shownBy } from './inference';
import { callLabel } from './labels';
import { type BiddingRule } from './rule';
import { viewOf } from './view';

export const NO_AGREEMENT = 'Geen specifieke afspraak.';

export interface Choice {
  readonly call: Call;
  readonly ruleId: string;
  readonly explanation: string;
}

const PASS_CHOICE: Choice = { call: PASS, ruleId: 'fallback-pass', explanation: NO_AGREEMENT };
const GAME_POINTS = 25;
const FIT_LENGTH = 8;

function isGame(contract: Bid): boolean {
  if (contract.strain === 'NT') return contract.level >= 3;
  if (contract.strain === 'H' || contract.strain === 'S') return contract.level >= 4;
  return contract.level >= 5;
}

export function fallbackChoice(
  rules: readonly BiddingRule[],
  hand: Hand,
  auction: Auction,
  maxLesson = Infinity,
): Choice {
  const view = viewOf(auction);
  // With silent opponents the partner made the partnership's latest bid
  const contract = view.partnerBids.at(-1);
  if (!view.opponentsSilent || !contract || isGame(contract)) return PASS_CHOICE;

  const facts = handFacts(hand);
  const partner = shownBy(rules, auction, partnerOf(view.seat), maxLesson);

  if (facts.hcp + partner.minHcp >= GAME_POINTS) {
    const fit = (['S', 'H'] as const).find(
      (major) => facts.lengths[major] + partner.minLength[major] >= FIT_LENGTH,
    );
    const game = fit ? bid(4, fit) : bid(3, 'NT');
    if (!isLegalCall(auction, game)) return PASS_CHOICE;
    return {
      call: game,
      ruleId: 'fallback-game',
      explanation: `${callLabel(game)}: samen minstens 25 punten, genoeg voor de manche.`,
    };
  }

  const first = view.partnerBids[0];
  if (
    contract.strain !== 'NT' &&
    first.strain !== 'NT' &&
    first.strain !== contract.strain &&
    facts.lengths[first.strain] >= facts.lengths[contract.strain]
  ) {
    const higher = SUITS.indexOf(first.strain) > SUITS.indexOf(contract.strain);
    const level = higher ? contract.level : contract.level + 1;
    if (level <= 7) {
      const preference = bid(level as Bid['level'], first.strain);
      if (isLegalCall(auction, preference)) {
        return {
          call: preference,
          ruleId: 'fallback-preference',
          explanation: `${callLabel(preference)}: voorkeur voor de eerste kleur van partner.`,
        };
      }
    }
  }

  return PASS_CHOICE;
}
