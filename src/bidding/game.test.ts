import { describe, expect, it } from 'vitest';
import {
  type Hand,
  SEATS,
  type Seat,
  addCall,
  callText,
  contractOf,
  dealCards,
  dealerForBoard,
  isAuctionComplete,
  newAuction,
  parseHand,
  seatToCall,
  seededRng,
} from '../core';
import { chooseCall, viewOf } from './index';

interface Step {
  readonly ruleId: string;
  readonly early: boolean;
}

// Lets all four hands bid until the auction ends
function bidOut(hands: Record<Seat, Hand>, dealer: Seat, maxLesson = 7) {
  let auction = newAuction(dealer);
  const steps: Step[] = [];
  while (!isAuctionComplete(auction)) {
    if (auction.calls.length > 60) throw new Error('Auction does not end');
    const view = viewOf(auction);
    const choice = chooseCall(hands[seatToCall(auction)], auction, { maxLesson });
    // Opening, response and opener's rebid: at most one earlier bid by each partner
    steps.push({
      ruleId: choice.ruleId,
      early: view.opponentsSilent && view.myBids.length <= 1 && view.partnerBids.length <= 1,
    });
    auction = addCall(auction, choice.call);
  }
  return { auction, steps, text: auction.calls.map(callText).join(' ') };
}

const WEAK_EAST = 'T98.J64.T73.T973';
const WEAK_WEST = '764.T95.986.J854';

function auctionFor(north: string, south: string, maxLesson = 7): string {
  const hands = {
    N: parseHand(north),
    E: parseHand(WEAK_EAST),
    S: parseHand(south),
    W: parseHand(WEAK_WEST),
  };
  return bidOut(hands, 'N', maxLesson).text;
}

describe('complete auctions', () => {
  it('stops in a part score after a declined invitation', () => {
    expect(auctionFor('AKJ52.Q73.K4.862', 'Q73.K52.A862.J54')).toBe('1S P 3S P P P');
  });

  it('bids game opposite 1NT', () => {
    expect(auctionFor('K42.Q73.AJ5.KQ62', 'K52.Q73.A842.Q62')).toBe('1NT P 3NT P P P');
  });

  it('accepts an invitation with a maximum', () => {
    expect(auctionFor('K73.AQJ52.A.K962', 'K52.Q73.KJ42.862')).toBe('1H P 2H P 3H P 4H P P P');
  });

  it('declines an invitation with a minimum', () => {
    expect(auctionFor('K73.AQJ52.A.K962', 'K52.Q73.J842.862')).toBe('1H P 2H P 3H P P P');
  });

  it('passes the board out without an opening hand', () => {
    expect(auctionFor('Q8642.K73.84.K62', 'K52.Q73.J842.862')).toBe('P P P P');
  });

  it('only opens in lesson 4', () => {
    expect(auctionFor('K42.Q73.AJ5.KQ62', 'K52.Q73.A842.Q62', 4)).toBe('1C P P P');
  });
});

describe('random deals', () => {
  const results = Array.from({ length: 300 }, (_, i) => {
    const seed = i + 1;
    const deal = dealCards(seededRng(seed));
    return { seed, ...bidOut(deal, dealerForBoard(seed)) };
  });

  it('always ends with a legal auction', () => {
    for (const { auction } of results) {
      expect(isAuctionComplete(auction)).toBe(true);
    }
  });

  it('never needs the fallback for an opening, a response or the opener rebid', () => {
    const gaps = results.flatMap(({ seed, steps }) =>
      steps
        .filter((step) => step.early && step.ruleId.startsWith('fallback'))
        .map((step) => `seed ${seed}: ${step.ruleId}`),
    );
    expect(gaps).toEqual([]);
  });

  it('reaches part scores, games and passed-out boards', () => {
    const contracts = results.map(({ auction }) => contractOf(auction));
    const passedOut = contracts.filter((contract) => contract === null).length;
    const games = contracts.filter(
      (contract) =>
        contract !== null &&
        (contract.level >= 5 ||
          (contract.level === 4 && (contract.strain === 'H' || contract.strain === 'S')) ||
          (contract.level >= 3 && contract.strain === 'NT')),
    ).length;
    expect(passedOut).toBeGreaterThan(0);
    expect(passedOut).toBeLessThan(150);
    expect(games).toBeGreaterThan(30);
    expect(games).toBeLessThan(200);
  });

  it('keeps the opponents of the opener silent', () => {
    for (const { auction } of results) {
      const contract = contractOf(auction);
      if (!contract) continue;
      const declaringSide = contract.declarer === 'N' || contract.declarer === 'S' ? 'NS' : 'EW';
      auction.calls.forEach((call, index) => {
        const seat = SEATS[(SEATS.indexOf(auction.dealer) + index) % 4];
        const side = seat === 'N' || seat === 'S' ? 'NS' : 'EW';
        if (side !== declaringSide) expect(call.type).toBe('pass');
      });
    }
  });
});
