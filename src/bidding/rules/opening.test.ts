import { describe, expect, it } from 'vitest';
import { callFor } from '../testing';
import { OPENING_RULES } from './opening';

const open = (hand: string, auction = '', maxLesson = 7) =>
  callFor(OPENING_RULES, hand, auction, maxLesson);

describe('opening one of a suit', () => {
  it('opens a five-card major', () => {
    expect(open('AKJ52.Q73.K4.862')).toBe('1S');
    expect(open('K73.AQJ52.84.K62')).toBe('1H');
  });

  it('opens the higher of two five-card suits', () => {
    expect(open('AK852.KQ963.4.72')).toBe('1S');
  });

  it('opens the longest suit', () => {
    expect(open('AQ4.K7.KJ8532.J5')).toBe('1D');
    expect(open('A2.K7.Q8532.AJ54')).toBe('1D');
  });

  it('opens one diamond with four diamonds and no five-card suit', () => {
    expect(open('KQ4.A72.QJ63.J52')).toBe('1D');
    expect(open('KQ42.AJ73.KJ63.5')).toBe('1D');
  });

  it('opens one club without a five-card suit or four diamonds', () => {
    expect(open('KQ42.AJ73.Q63.J5')).toBe('1C'); // only two clubs
    expect(open('AQ42.K73.J63.K52')).toBe('1C');
    expect(open('KQ42.AJ73.5.KJ63')).toBe('1C');
  });

  it('opens one of a suit with a strong hand that is not 15-17 balanced', () => {
    expect(open('AK2.KQ3.AJ5.KQ62')).toBe('1C'); // 22 points
  });
});

describe('opening one no trump', () => {
  it('opens 1NT with 15-17 balanced', () => {
    expect(open('K42.Q73.AJ5.KQ62')).toBe('1NT');
    expect(open('AQJ52.KJ3.K4.Q62')).toBe('1NT'); // five-card major, still balanced
  });

  it('is not available before lesson 5', () => {
    expect(open('K42.Q73.AJ5.KQ62', '', 4)).toBe('1C');
  });
});

describe('passing', () => {
  it('passes with fewer than 12 points', () => {
    expect(open('Q8642.K73.84.K62')).toBe('P');
  });

  it('opens in any seat after passes', () => {
    expect(open('AKJ52.Q73.K4.862', 'P P P')).toBe('1S');
    expect(open('Q8642.K73.84.K62', 'P P')).toBe('P');
  });

  it('has no opening rule once someone has bid', () => {
    expect(open('AKJ52.Q73.K4.862', '1H')).toBe('none');
  });
});
