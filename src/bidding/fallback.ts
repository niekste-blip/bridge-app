import {
  type Auction,
  type Bid,
  type Call,
  type Hand,
  PASS,
  SUITS,
  type Suit,
  bid,
  isLegalCall,
  partnerOf,
} from '../core';
import { handFacts } from './evaluate';
import { shownBy } from './inference';
import { callLabel } from './labels';
import { type BiddingRule } from './rule';
import { viewOf } from './view';

export interface Choice {
  readonly call: Call;
  readonly ruleId: string;
  readonly explanation: string;
  // 'rule' when a bidding rule prescribed the call, 'fallback' when no rule applied
  readonly source: 'rule' | 'fallback';
}

const PASS_CHOICE: Choice = {
  call: PASS,
  ruleId: 'fallback-pass',
  explanation: 'Pas: geen afspraak die een bod voorschrijft.',
  source: 'fallback',
};
const GAME_POINTS = 25;
const FIT_LENGTH = 8;

function isGame(contract: Bid): boolean {
  if (contract.strain === 'NT') return contract.level >= 3;
  if (contract.strain === 'H' || contract.strain === 'S') return contract.level >= 4;
  return contract.level >= 5;
}

// With equal length only a major is preferred: it promises five cards, a minor may be short
function prefersFirst(firstLength: number, secondLength: number, first: Suit): boolean {
  return firstLength > secondLength || (firstLength === secondLength && (first === 'H' || first === 'S'));
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
      source: 'fallback',
    };
  }

  // Preference: partner showed two suits of his own and I choose between them, once
  const first = view.partnerBids[0];
  const mySuits = view.myBids.map((mine) => mine.strain);
  if (
    view.myBids.length <= 1 &&
    contract.strain !== 'NT' &&
    first.strain !== 'NT' &&
    first.strain !== contract.strain &&
    !mySuits.includes(first.strain) &&
    !mySuits.includes(contract.strain) &&
    prefersFirst(facts.lengths[first.strain], facts.lengths[contract.strain], first.strain)
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
          source: 'fallback',
        };
      }
    }
  }

  return PASS_CHOICE;
}
