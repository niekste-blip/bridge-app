import { describe, expect, it } from 'vitest';
import { callFor } from '../testing';
import { RESPONSE_RULES } from './response';

const respond = (opening: string, hand: string) => callFor(RESPONSE_RULES, hand, `${opening} P`);

describe('responding to one of a major', () => {
  it('passes with fewer than 6 points', () => {
    expect(respond('1H', 'J52.Q73.9842.862')).toBe('P');
    expect(respond('1H', 'K52.Q73.9842.862')).toBe('P');
  });

  it('raises with three-card support', () => {
    expect(respond('1H', 'K52.Q73.J842.862')).toBe('2H');
    expect(respond('1H', 'K52.QJ73.A842.82')).toBe('3H');
    expect(respond('1H', 'K52.QJ73.A842.K2')).toBe('4H');
    expect(respond('1S', 'K52.Q73.J842.862')).toBe('2S');
  });

  it('bids one spade over one heart with four spades and no support', () => {
    expect(respond('1H', 'KJ52.73.Q842.862')).toBe('1S');
  });

  it('bids 1NT with 6-9 points and nothing else to say', () => {
    expect(respond('1H', 'K52.73.Q842.J862')).toBe('1NT');
    expect(respond('1S', '52.QJ873.K842.86')).toBe('1NT');
  });

  it('bids a new suit at the two level with 10 or more points', () => {
    expect(respond('1H', 'K52.73.AQ842.J86')).toBe('2D');
    expect(respond('1H', 'K52.73.AQ84.KJ86')).toBe('2C'); // lower of two four-card suits
    expect(respond('1S', 'K5.QJ87.A842.862')).toBe('2D'); // 2H would need five hearts
    expect(respond('1S', 'K5.QJ873.A842.86')).toBe('2H');
  });
});

describe('responding to one of a minor', () => {
  it('bids four-card suits up the line', () => {
    expect(respond('1D', 'KJ52.Q873.42.862')).toBe('1H');
    expect(respond('1C', 'KJ52.Q873.J42.86')).toBe('1H');
    expect(respond('1C', 'K52.Q73.J842.862')).toBe('1D');
  });

  it('bids the longer major first', () => {
    expect(respond('1D', 'KJ852.Q873.42.86')).toBe('1S');
  });

  it('raises the minor without a four-card major', () => {
    expect(respond('1D', 'K52.Q73.J842.862')).toBe('2D');
    expect(respond('1D', 'K5.73.AJ8642.Q62')).toBe('3D');
    expect(respond('1C', 'K52.73.842.QJ862')).toBe('2C');
  });

  it('bids 3NT with support and 12 or more points', () => {
    expect(respond('1D', 'AQ5.K84.KQ8753.3')).toBe('3NT'); // 14
  });

  it('bids no trump with a balanced hand without a four-card major', () => {
    expect(respond('1D', 'K52.Q73.J8.Q8642')).toBe('1NT');
    expect(respond('1C', 'K52.Q73.842.J862')).toBe('1NT');
    expect(respond('1D', 'K52.Q73.AJ42.862')).toBe('2NT');
    expect(respond('1D', 'K52.A73.AJ42.862')).toBe('3NT');
  });

  it('bids two clubs over one diamond with 10 or more points and clubs', () => {
    expect(respond('1D', 'K52.A7.84.KQ8642')).toBe('2C');
  });

  it('passes with fewer than 6 points', () => {
    expect(respond('1C', 'J52.Q73.9842.862')).toBe('P');
  });
});

describe('situation', () => {
  it('has no rule opposite 1NT or after an overcall', () => {
    expect(callFor(RESPONSE_RULES, 'K52.Q73.J842.862', '1NT P')).toBe('none');
    expect(callFor(RESPONSE_RULES, 'K52.Q73.J842.862', '1H 1S')).toBe('none');
  });
});
