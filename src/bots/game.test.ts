import { describe, expect, it } from 'vitest';
import {
  type Auction,
  type Contract,
  type Deal,
  SEATS,
  addCall,
  contractOf,
  dealCards,
  dealerForBoard,
  isAuctionComplete,
  isPlayComplete,
  newAuction,
  seatToCall,
  seededRng,
  sideOf,
  startPlay,
  tricksWon,
} from '../core';
import { type Level, botCall, botCard } from './index';
import { playOut } from './testing';

interface Board {
  readonly seed: number;
  readonly deal: Deal;
  readonly auction: Auction;
  readonly contract: Contract;
}

// The first `count` boards that are not passed out, bid by the bots
function boards(count: number): Board[] {
  const result: Board[] = [];
  for (let seed = 1; result.length < count; seed++) {
    const deal = dealCards(seededRng(seed));
    let auction = newAuction(dealerForBoard(seed));
    while (!isAuctionComplete(auction)) {
      auction = addCall(auction, botCall(deal[seatToCall(auction)], auction, 'hard').call);
    }
    const contract = contractOf(auction);
    if (contract) result.push({ seed, deal, auction, contract });
  }
  return result;
}

// Tricks for the declaring side when the two sides play at the given levels
function declarerTricks(board: Board, declaring: Level, defending: Level): number {
  const side = sideOf(board.contract.declarer);
  const rng = seededRng(board.seed * 7 + 1);
  const end = playOut(startPlay(board.deal, board.contract), board.auction, (view) =>
    botCard(view, sideOf(view.seat) === side ? declaring : defending, rng, {
      samples: 12,
      maxCards: 8,
    }),
  );
  return tricksWon(end, side);
}

describe('bots playing whole boards', () => {
  it('finish every board with legal cards only', () => {
    const levels: Level[] = ['easy', 'medium', 'hard'];
    for (const board of boards(12)) {
      const rng = seededRng(board.seed);
      const end = playOut(startPlay(board.deal, board.contract), board.auction, (view) =>
        botCard(view, levels[SEATS.indexOf(view.seat) % 3], rng, { samples: 6, maxCards: 6 }),
      );
      expect(isPlayComplete(end)).toBe(true);
      expect(end.completed).toHaveLength(13);
      expect(tricksWon(end, 'NS') + tricksWon(end, 'EW')).toBe(13);
    }
  });

  it('take more tricks with simulation than with rules of thumb', () => {
    let baseline = 0;
    let strongDeclarer = 0;
    let strongDefence = 0;
    for (const board of boards(16)) {
      baseline += declarerTricks(board, 'easy', 'easy');
      strongDeclarer += declarerTricks(board, 'hard', 'easy');
      strongDefence += declarerTricks(board, 'easy', 'hard');
    }
    expect(strongDeclarer).toBeGreaterThan(baseline);
    expect(strongDefence).toBeLessThan(baseline);
  }, 60000);
});
