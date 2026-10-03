import { describe, expect, it } from 'vitest';
import { parseHand } from '../core';
import { handFacts, lengthOf, meets, points, preferredSuit } from './evaluate';

const facts = (text: string) => handFacts(parseHand(text));

describe('handFacts', () => {
  it('counts points and suit lengths', () => {
    expect(facts('AKJ52.Q73.K4.862')).toEqual({
      hcp: 13,
      lengths: { S: 5, H: 3, D: 2, C: 3 },
      balanced: true,
    });
  });

  it('recognises balanced shapes', () => {
    expect(facts('AQ42.K73.J63.K52').balanced).toBe(true); // 4-3-3-3
    expect(facts('KQ42.AJ73.Q63.J5').balanced).toBe(true); // 4-4-3-2
    expect(facts('AKJ52.Q73.K4.862').balanced).toBe(true); // 5-3-3-2
  });

  it('recognises unbalanced shapes', () => {
    expect(facts('AKJ52.Q7.K4.8762').balanced).toBe(false); // 5-4-2-2
    expect(facts('KQ42.AJ73.KJ63.5').balanced).toBe(false); // 4-4-4-1
    expect(facts('AQ4.K7.KJ8532.J5').balanced).toBe(false); // 6-3-2-2
  });
});

describe('meets', () => {
  const hand = facts('AKJ52.Q73.K4.862');

  it('accepts a hand without any requirement', () => {
    expect(meets(hand, {})).toBe(true);
  });

  it('checks the point range, bounds included', () => {
    expect(meets(hand, { hcp: points(12) })).toBe(true);
    expect(meets(hand, { hcp: points(13, 13) })).toBe(true);
    expect(meets(hand, { hcp: points(14) })).toBe(false);
    expect(meets(hand, { hcp: points(0, 12) })).toBe(false);
  });

  it('checks suit lengths', () => {
    expect(meets(hand, { lengths: lengthOf('S', 5) })).toBe(true);
    expect(meets(hand, { lengths: lengthOf('S', 6) })).toBe(false);
    expect(meets(hand, { lengths: { H: [0, 3], S: [0, 3] } })).toBe(false);
    expect(meets(hand, { lengths: { H: [0, 3], D: [0, 3] } })).toBe(true);
  });

  it('checks the shape', () => {
    expect(meets(hand, { balanced: true })).toBe(true);
    expect(meets(hand, { balanced: false })).toBe(false);
  });

  it('checks the extra condition', () => {
    expect(meets(hand, { also: (f) => f.lengths.S > f.lengths.H })).toBe(true);
    expect(meets(hand, { also: () => false })).toBe(false);
  });
});

describe('preferredSuit', () => {
  const allFive = { C: 5, D: 5, H: 5, S: 5 };
  const majorsFour = { H: 4, S: 4 };

  it('takes the longest suit', () => {
    expect(preferredSuit(facts('KJ852.Q873.42.86'), majorsFour)).toBe('S');
    expect(preferredSuit(facts('A2.K7.Q8532.AJ54'), allFive)).toBe('D');
  });

  it('takes the higher of two suits of five or more', () => {
    expect(preferredSuit(facts('AK852.KQ963.4.72'), allFive)).toBe('S');
  });

  it('takes the lower of two four-card suits', () => {
    expect(preferredSuit(facts('KJ52.Q873.42.862'), majorsFour)).toBe('H');
  });

  it('ignores suits that are too short or not listed', () => {
    expect(preferredSuit(facts('K52.Q73.J842.862'), majorsFour)).toBeNull();
    expect(preferredSuit(facts('K5.QJ87.A842.862'), { C: 4, D: 4, H: 5 })).toBe('D');
  });
});
