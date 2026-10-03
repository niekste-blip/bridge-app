import { describe, expect, it } from 'vitest';
import { auctionFrom, callText, parseHand } from '../core';
import { type BiddingOptions, chooseCall, meaningsOf } from './engine';

const choose = (hand: string, auction: string, options?: BiddingOptions) =>
  chooseCall(parseHand(hand), auctionFrom('N', auction), options);

describe('chooseCall', () => {
  it('returns the call, the rule and the explanation', () => {
    const choice = choose('K73.AQJ52.84.K62', '');
    expect(callText(choice.call)).toBe('1H');
    expect(choice.ruleId).toBe('open-1H');
    expect(choice.explanation).toBe('1♥: vanaf 12 punten en minstens 5 harten.');
    expect(choice.source).toBe('rule');
  });

  it('uses the whole rule table', () => {
    expect(choose('K42.Q73.AJ5.KQ62', '').ruleId).toBe('open-1NT');
    expect(choose('K52.Q73.A842.Q62', '1NT P').ruleId).toBe('nt-resp-3NT');
    expect(choose('K52.Q73.J842.862', '1H P').ruleId).toBe('resp-raise2-H');
    expect(choose('K73.AQJ52.A.K962', '1H P 2H P').ruleId).toBe('rebid-1H-2H-invite');
  });

  it('respects the lesson limit', () => {
    expect(choose('K42.Q73.AJ5.KQ62', '', { maxLesson: 4 }).ruleId).toBe('open-1C');
    expect(choose('K52.Q73.J842.862', '1H P', { maxLesson: 5 }).ruleId).toBe('fallback-pass');
    expect(choose('K73.AQJ52.84.K62', '', { maxLesson: 3 }).ruleId).toBe('fallback-pass');
  });

  it('falls back when no rule applies', () => {
    const choice = choose('K52.AQ73.J84.K62', '1D P 1H P 1NT P');
    expect(callText(choice.call)).toBe('3NT');
    expect(choice.ruleId).toBe('fallback-game');
    expect(choice.source).toBe('fallback');
  });

  it('accepts a custom rule list', () => {
    expect(choose('K73.AQJ52.84.K62', '', { rules: [] }).ruleId).toBe('fallback-pass');
  });

  it('refuses a finished auction', () => {
    expect(() => choose('K73.AQJ52.84.K62', 'P P P P')).toThrow();
  });
});

describe('meaningsOf', () => {
  const auction = auctionFrom('N', '1H P 2H P');

  it('gives the meaning of a call', () => {
    expect(meaningsOf(auction, 0)).toEqual(['1♥: vanaf 12 punten en minstens 5 harten.']);
    expect(meaningsOf(auction, 2)).toEqual(['2♥: 6 tot en met 9 punten en minstens 3 harten mee.']);
  });

  it('gives every meaning when several rules prescribe the same call', () => {
    expect(meaningsOf(auctionFrom('N', '1C P 1S P 2C P'), 4)).toEqual([
      '2♣: 12 tot en met 15 punten en minstens 6 klaveren.',
      '2♣: herhaling van de openingskleur, minstens 5 klaveren.',
    ]);
  });

  it('has no meaning for a call outside the rules', () => {
    expect(meaningsOf(auction, 1)).toEqual([]);
    expect(meaningsOf(auctionFrom('N', '1H P 3C P'), 2)).toEqual([]);
  });

  it('respects the lesson limit', () => {
    expect(meaningsOf(auction, 2, { maxLesson: 5 })).toEqual([]);
  });

  it('rejects a position without a call', () => {
    expect(() => meaningsOf(auction, 9)).toThrow(RangeError);
  });
});
