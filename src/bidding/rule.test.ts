import { describe, expect, it } from 'vitest';
import { PASS, auctionFrom, bid, parseHand } from '../core';
import { points } from './evaluate';
import { rule, selectRule } from './rule';
import { callFor } from './testing';

const always = () => true;
const never = () => false;
const low = rule('low', 4, 1, PASS, always, {}, 'laag.');
const high = rule('high', 5, 9, bid(1, 'C'), always, { hcp: points(12) }, 'hoog.');

const STRONG = 'AKJ52.Q73.K4.862'; // 13 points
const WEAK = 'Q8642.K73.84.K62'; // 8 points

describe('rule', () => {
  it('starts the explanation with the call in Dutch notation', () => {
    expect(high.explanation).toBe('1♣: hoog.');
    expect(low.explanation).toBe('Pas: laag.');
  });
});

describe('selectRule', () => {
  const pick = (hand: string, auction: string, maxLesson?: number) =>
    selectRule([low, high], parseHand(hand), auctionFrom('N', auction), maxLesson)?.id;

  it('takes the highest priority rule that fits', () => {
    expect(pick(STRONG, '')).toBe('high');
  });

  it('skips a rule when the hand does not meet its requirement', () => {
    expect(pick(WEAK, '')).toBe('low');
  });

  it('skips rules from later lessons', () => {
    expect(pick(STRONG, '', 4)).toBe('low');
    expect(pick(STRONG, '', 5)).toBe('high');
    expect(pick(STRONG, '', 3)).toBeUndefined();
  });

  it('skips a rule whose call is not legal', () => {
    expect(pick(STRONG, '1D')).toBe('low');
  });

  it('skips a rule whose situation does not apply', () => {
    const blocked = rule('blocked', 4, 99, bid(1, 'S'), never, {}, 'nooit.');
    const chosen = selectRule([blocked, low], parseHand(STRONG), auctionFrom('N', ''));
    expect(chosen?.id).toBe('low');
  });

  it('takes the first rule on equal priority', () => {
    const first = rule('first', 4, 5, bid(1, 'H'), always, {}, 'eerste.');
    const second = rule('second', 4, 5, bid(1, 'S'), always, {}, 'tweede.');
    const chosen = selectRule([first, second], parseHand(STRONG), auctionFrom('N', ''));
    expect(chosen?.id).toBe('first');
  });

  it('returns null when nothing fits', () => {
    expect(selectRule([high], parseHand(WEAK), auctionFrom('N', ''))).toBeNull();
  });
});

describe('callFor', () => {
  it('gives the chosen call as text', () => {
    expect(callFor([low, high], STRONG, '')).toBe('1C');
    expect(callFor([low, high], WEAK, '')).toBe('P');
    expect(callFor([high], WEAK, '')).toBe('none');
    expect(callFor([low, high], STRONG, '', 4)).toBe('P');
  });
});
