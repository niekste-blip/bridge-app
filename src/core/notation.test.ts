import { describe, expect, it } from 'vitest';
import { DOUBLE, PASS, REDOUBLE, bid } from './auction';
import { auctionFrom, callText, parseCall, sameCall } from './notation';

describe('callText and parseCall', () => {
  it('writes calls as short text', () => {
    expect(callText(PASS)).toBe('P');
    expect(callText(DOUBLE)).toBe('X');
    expect(callText(REDOUBLE)).toBe('XX');
    expect(callText(bid(1, 'NT'))).toBe('1NT');
    expect(callText(bid(4, 'S'))).toBe('4S');
  });

  it('reads the same text back', () => {
    for (const text of ['P', 'X', 'XX', '1C', '2H', '3NT', '7S']) {
      expect(callText(parseCall(text))).toBe(text);
    }
  });

  it('rejects invalid text', () => {
    for (const text of ['', '8H', '0C', '1X', 'pass', '1']) {
      expect(() => parseCall(text)).toThrow();
    }
  });
});

describe('sameCall', () => {
  it('compares type, level and strain', () => {
    expect(sameCall(bid(1, 'H'), bid(1, 'H'))).toBe(true);
    expect(sameCall(bid(1, 'H'), bid(2, 'H'))).toBe(false);
    expect(sameCall(bid(1, 'H'), bid(1, 'S'))).toBe(false);
    expect(sameCall(PASS, { type: 'pass' })).toBe(true);
    expect(sameCall(PASS, DOUBLE)).toBe(false);
  });
});

describe('auctionFrom', () => {
  it('builds an auction from text', () => {
    const auction = auctionFrom('E', '1H P 2H');
    expect(auction.dealer).toBe('E');
    expect(auction.calls.map(callText)).toEqual(['1H', 'P', '2H']);
  });

  it('accepts empty text', () => {
    expect(auctionFrom('N', '').calls).toEqual([]);
    expect(auctionFrom('N', '   ').calls).toEqual([]);
  });

  it('rejects an illegal sequence', () => {
    expect(() => auctionFrom('N', '2H 1S')).toThrow();
  });
});
