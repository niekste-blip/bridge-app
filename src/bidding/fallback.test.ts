import { describe, expect, it } from 'vitest';
import { auctionFrom, callText, parseHand } from '../core';
import { NO_AGREEMENT, fallbackChoice } from './fallback';
import { ALL_RULES } from './rules';

const fallback = (hand: string, auction: string) =>
  fallbackChoice(ALL_RULES, parseHand(hand), auctionFrom('N', auction));
const call = (hand: string, auction: string) => callText(fallback(hand, auction).call);

describe('fallbackChoice', () => {
  it('passes when the opponents have bid', () => {
    const choice = fallback('KJ52.73.Q842.862', '1H 1S');
    expect(callText(choice.call)).toBe('P');
    expect(choice.ruleId).toBe('fallback-pass');
    expect(choice.explanation).toBe(NO_AGREEMENT);
  });

  it('passes when the partnership has not bid', () => {
    expect(call('AKJ52.Q73.K4.862', 'P 1H')).toBe('P');
  });

  it('passes when game has been reached', () => {
    expect(call('AKJ52.Q73.K.A862', '1S P 4S P')).toBe('P');
    expect(call('K42.Q73.AJ5.KQ62', '1NT P 3NT P')).toBe('P');
  });

  it('bids 3NT with 25 points together and no major fit', () => {
    const choice = fallback('K52.AQ73.J84.K62', '1D P 1H P 1NT P'); // 13 opposite 12-14
    expect(callText(choice.call)).toBe('3NT');
    expect(choice.ruleId).toBe('fallback-game');
    expect(choice.explanation).toBe('3SA: samen minstens 25 punten, genoeg voor de manche.');
  });

  it('bids four of a major with 25 points together and an eight-card fit', () => {
    expect(call('KQ852.K73.A84.Q2', '1H P 1S P 2H P')).toBe('4H'); // 14 opposite 12+, 3+5 hearts
  });

  it('passes with too little for game', () => {
    expect(call('K52.QJ73.J84.862', '1D P 1H P 1NT P')).toBe('P'); // 7 opposite 12-14
    expect(call('K52.Q73.J842.862', '1H P 2H P 3H P')).toBe('P'); // 6 opposite 16-18
  });

  it('accepts an invitation with a maximum', () => {
    expect(call('K52.Q73.KJ42.862', '1H P 2H P 3H P')).toBe('4H'); // 9 opposite 16-18
  });

  it('gives preference to the first suit of partner', () => {
    const choice = fallback('KJ852.73.Q842.86', '1H P 1S P 2C P');
    expect(callText(choice.call)).toBe('2H');
    expect(choice.ruleId).toBe('fallback-preference');
    expect(choice.explanation).toBe('2♥: voorkeur voor de eerste kleur van partner.');
  });

  it('passes with more cards in the second suit of partner', () => {
    expect(call('KJ852.7.Q84.8762', '1H P 1S P 2C P')).toBe('P');
  });
});
