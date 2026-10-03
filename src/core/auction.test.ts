import { describe, expect, it } from 'vitest';
import {
  type Auction,
  type Call,
  DOUBLE,
  PASS,
  REDOUBLE,
  addCall,
  bid,
  contractOf,
  isAuctionComplete,
  isLegalCall,
  legalCalls,
  newAuction,
  seatToCall,
} from './auction';
import { type Seat } from './seats';

function auctionOf(dealer: Seat, ...calls: Call[]): Auction {
  return calls.reduce(addCall, newAuction(dealer));
}

describe('seatToCall', () => {
  it('starts with the dealer and moves clockwise', () => {
    expect(seatToCall(newAuction('S'))).toBe('S');
    expect(seatToCall(auctionOf('S', PASS))).toBe('W');
    expect(seatToCall(auctionOf('S', PASS, PASS, PASS))).toBe('E');
  });
});

describe('bids', () => {
  it('allows pass and all 35 bids at the start, but no double', () => {
    const calls = legalCalls(newAuction('N'));
    expect(calls).toHaveLength(36);
    expect(calls).toContainEqual(PASS);
    expect(calls).not.toContainEqual(DOUBLE);
    expect(calls).not.toContainEqual(REDOUBLE);
  });

  it('requires a bid higher than the last bid', () => {
    const auction = auctionOf('N', bid(1, 'H'));
    expect(isLegalCall(auction, bid(1, 'C'))).toBe(false);
    expect(isLegalCall(auction, bid(1, 'D'))).toBe(false);
    expect(isLegalCall(auction, bid(1, 'H'))).toBe(false);
    expect(isLegalCall(auction, bid(1, 'S'))).toBe(true);
    expect(isLegalCall(auction, bid(1, 'NT'))).toBe(true);
    expect(isLegalCall(auction, bid(2, 'C'))).toBe(true);
  });

  it('leaves only pass and double above 7NT', () => {
    expect(legalCalls(auctionOf('N', bid(7, 'NT')))).toEqual([PASS, DOUBLE]);
  });
});

describe('double', () => {
  it('is allowed on an opponent bid', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H')), DOUBLE)).toBe(true);
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), PASS, PASS), DOUBLE)).toBe(true);
  });

  it('is not allowed on a partner bid', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), PASS), DOUBLE)).toBe(false);
  });

  it('is not allowed twice', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, PASS, PASS), DOUBLE)).toBe(false);
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, PASS), DOUBLE)).toBe(false);
  });
});

describe('redouble', () => {
  it('is allowed on an opponent double', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE), REDOUBLE)).toBe(true);
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, PASS, PASS), REDOUBLE)).toBe(true);
  });

  it('is not allowed on a partner double or without a double', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, PASS), REDOUBLE)).toBe(false);
    expect(isLegalCall(auctionOf('N', bid(1, 'H')), REDOUBLE)).toBe(false);
  });

  it('blocks a further double', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, REDOUBLE), DOUBLE)).toBe(false);
  });
});

describe('isAuctionComplete', () => {
  it('ends after four passes', () => {
    expect(isAuctionComplete(auctionOf('N', PASS, PASS, PASS))).toBe(false);
    expect(isAuctionComplete(auctionOf('N', PASS, PASS, PASS, PASS))).toBe(true);
  });

  it('ends after three passes following a bid', () => {
    expect(isAuctionComplete(auctionOf('N', PASS, PASS, PASS, bid(1, 'H')))).toBe(false);
    expect(isAuctionComplete(auctionOf('N', bid(1, 'NT'), PASS, PASS))).toBe(false);
    expect(isAuctionComplete(auctionOf('N', bid(1, 'NT'), PASS, PASS, PASS))).toBe(true);
  });

  it('allows no calls after the end', () => {
    const auction = auctionOf('N', bid(1, 'NT'), PASS, PASS, PASS);
    expect(legalCalls(auction)).toEqual([]);
    expect(() => addCall(auction, PASS)).toThrow();
  });
});

describe('addCall', () => {
  it('rejects an illegal call', () => {
    expect(() => addCall(auctionOf('N', bid(2, 'H')), bid(1, 'S'))).toThrow();
    expect(() => addCall(newAuction('N'), DOUBLE)).toThrow();
  });

  it('does not change the original auction', () => {
    const auction = newAuction('N');
    addCall(auction, PASS);
    expect(auction.calls).toHaveLength(0);
  });
});

describe('contractOf', () => {
  it('returns null when everyone passes', () => {
    expect(contractOf(auctionOf('N', PASS, PASS, PASS, PASS))).toBeNull();
  });

  it('throws while the auction is still running', () => {
    expect(() => contractOf(auctionOf('N', bid(1, 'H')))).toThrow();
  });

  it('gives the final bid and the declarer', () => {
    expect(contractOf(auctionOf('E', bid(1, 'NT'), PASS, PASS, PASS))).toEqual({
      level: 1,
      strain: 'NT',
      doubling: 'none',
      declarer: 'E',
    });
  });

  it('makes the first player of the side to name the strain declarer', () => {
    // N: 1C, S: 1H, N: 2H, S: 4H -> South named hearts first
    const auction = auctionOf(
      'N',
      bid(1, 'C'), PASS, bid(1, 'H'), PASS,
      bid(2, 'H'), PASS, bid(4, 'H'), PASS,
      PASS, PASS,
    );
    expect(contractOf(auction)).toEqual({ level: 4, strain: 'H', doubling: 'none', declarer: 'S' });
  });

  it('ignores an opponent who named the strain earlier', () => {
    // E bids spades first, but N-S end up in spades: North is declarer
    const auction = auctionOf('E', bid(1, 'S'), PASS, PASS, bid(2, 'S'), PASS, PASS, PASS);
    expect(contractOf(auction)?.declarer).toBe('N');
  });

  it('records doubles and redoubles on the final bid only', () => {
    expect(contractOf(auctionOf('N', bid(1, 'H'), DOUBLE, PASS, PASS, PASS))?.doubling).toBe('doubled');
    expect(
      contractOf(auctionOf('N', bid(1, 'H'), DOUBLE, REDOUBLE, PASS, PASS, PASS))?.doubling,
    ).toBe('redoubled');
    expect(
      contractOf(auctionOf('N', bid(1, 'H'), DOUBLE, bid(2, 'H'), PASS, PASS, PASS))?.doubling,
    ).toBe('none');
  });
});
