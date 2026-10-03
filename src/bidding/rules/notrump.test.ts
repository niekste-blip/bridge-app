import { describe, expect, it } from 'vitest';
import { callFor } from '../testing';
import { NOTRUMP_RULES } from './notrump';

const call = (hand: string, auction: string) => callFor(NOTRUMP_RULES, hand, auction);

describe('responding to 1NT', () => {
  const respond = (hand: string) => call(hand, '1NT P');

  it('passes with a weak hand without a five-card suit', () => {
    expect(respond('J52.Q73.9842.862')).toBe('P');
  });

  it('signs off in a five-card suit with a weak hand', () => {
    expect(respond('J8542.Q73.9.8642')).toBe('2S');
    expect(respond('73.QJ852.9.86432')).toBe('2H'); // clubs are not an option
    expect(respond('73.Q85.J9642.864')).toBe('2D');
  });

  it('invites with 8 or 9 points', () => {
    expect(respond('K52.Q73.J842.Q62')).toBe('2NT');
  });

  it('bids game with 10 or more points', () => {
    expect(respond('K52.Q73.A842.Q62')).toBe('3NT');
  });

  it('shows a five-card major with 10 or more points', () => {
    expect(respond('KJ852.Q73.A4.862')).toBe('3S');
    expect(respond('K52.QJ873.A4.862')).toBe('3H');
    expect(respond('AQ852.KJ854.4.73')).toBe('3S'); // five-five: spades first
  });

  it('bids game in a six-card major with 10 or more points', () => {
    expect(respond('KJ8542.Q7.A4.862')).toBe('4S');
    expect(respond('K5.QJ8742.A4.862')).toBe('4H');
  });

  it('has no rule opposite another opening', () => {
    expect(call('K52.Q73.A842.Q62', '1H P')).toBe('none');
  });
});

describe('rebid by the 1NT opener', () => {
  const MINIMUM = 'K42.Q73.AJ5.KQ62'; // 15 points, three spades
  const MAXIMUM = 'AQJ52.KJ3.K4.Q62'; // 16 points

  it('passes a sign-off', () => {
    expect(call(MAXIMUM, '1NT P 2H P')).toBe('P');
    expect(call(MAXIMUM, '1NT P 2D P')).toBe('P');
    expect(call(MINIMUM, '1NT P 2S P')).toBe('P');
  });

  it('accepts the invitation with 16 or 17 points', () => {
    expect(call(MAXIMUM, '1NT P 2NT P')).toBe('3NT');
    expect(call(MINIMUM, '1NT P 2NT P')).toBe('P');
  });

  it('chooses between 3NT and four of the major', () => {
    expect(call(MINIMUM, '1NT P 3S P')).toBe('4S');
    expect(call('K4.Q73.AJ52.KQ62', '1NT P 3S P')).toBe('3NT');
    expect(call(MINIMUM, '1NT P 3H P')).toBe('4H');
  });

  it('passes when game has been bid', () => {
    expect(call(MAXIMUM, '1NT P 3NT P')).toBe('P');
    expect(call(MAXIMUM, '1NT P 4H P')).toBe('P');
    expect(call(MAXIMUM, '1NT P 4S P')).toBe('P');
  });
});
