import { describe, expect, it } from 'vitest';
import { auctionFrom, bid, callText } from '../core';
import { isOpening, isRebidAfter, isResponseTo, viewOf } from './view';

const view = (text: string) => viewOf(auctionFrom('N', text));

describe('viewOf', () => {
  it('describes the auction from the seat to call', () => {
    const v = view('1H P 1S P 2C P');
    expect(v.seat).toBe('S');
    expect(v.myBids.map(callText)).toEqual(['1S']);
    expect(v.partnerBids.map(callText)).toEqual(['1H', '2C']);
    expect(v.opponentsSilent).toBe(true);
  });

  it('notices opponents who bid or double', () => {
    expect(view('1H 1S').opponentsSilent).toBe(false);
    expect(view('1H X').opponentsSilent).toBe(false);
    expect(view('1H P').opponentsSilent).toBe(true);
  });
});

describe('isOpening', () => {
  it('is true until someone bids', () => {
    expect(isOpening(view(''))).toBe(true);
    expect(isOpening(view('P P P'))).toBe(true);
    expect(isOpening(view('1H P'))).toBe(false);
    expect(isOpening(view('P 1H'))).toBe(false);
  });
});

describe('isResponseTo', () => {
  it('matches the first call opposite an opening', () => {
    expect(isResponseTo(view('1H P'), bid(1, 'H'))).toBe(true);
    expect(isResponseTo(view('1H P'), bid(1, 'S'))).toBe(false);
  });

  it('also holds for a hand that passed earlier', () => {
    expect(isResponseTo(view('P P 1H P'), bid(1, 'H'))).toBe(true);
  });

  it('fails when an opponent has bid, or after the first response', () => {
    expect(isResponseTo(view('1H 1S'), bid(1, 'H'))).toBe(false);
    expect(isResponseTo(view('1H P 1S P 2C P'), bid(1, 'H'))).toBe(false);
  });

  it('fails for the opponents of the opener', () => {
    expect(isResponseTo(view('1H'), bid(1, 'H'))).toBe(false);
  });
});

describe('isRebidAfter', () => {
  it('matches the opener after a response', () => {
    expect(isRebidAfter(view('1H P 2H P'), bid(1, 'H'), bid(2, 'H'))).toBe(true);
    expect(isRebidAfter(view('1H P 2H P'), bid(1, 'H'), bid(1, 'S'))).toBe(false);
    expect(isRebidAfter(view('P 1H P 1S P'), bid(1, 'H'), bid(1, 'S'))).toBe(true);
  });

  it('fails for the responder and in later rounds', () => {
    expect(isRebidAfter(view('1H P 1S P 2C P'), bid(1, 'H'), bid(1, 'S'))).toBe(false);
    expect(isRebidAfter(view('1H P 1S P 2C P 2H P'), bid(1, 'H'), bid(1, 'S'))).toBe(false);
  });

  it('fails when an opponent has bid', () => {
    expect(isRebidAfter(view('1H P 2H 2S'), bid(1, 'H'), bid(2, 'H'))).toBe(false);
    expect(isRebidAfter(view('1H 1S 2H P'), bid(1, 'H'), bid(2, 'H'))).toBe(false);
  });
});
