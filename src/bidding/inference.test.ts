import { describe, expect, it } from 'vitest';
import { auctionFrom } from '../core';
import { shownBy } from './inference';
import { ALL_RULES } from './rules';

const shown = (auction: string, seat: 'N' | 'E' | 'S' | 'W', maxLesson?: number) =>
  shownBy(ALL_RULES, auctionFrom('N', auction), seat, maxLesson);

const NOTHING = { minHcp: 0, maxHcp: 40, minLength: { C: 0, D: 0, H: 0, S: 0 } };

describe('shownBy', () => {
  it('knows nothing about a player who has not called', () => {
    expect(shown('', 'N')).toEqual(NOTHING);
    expect(shown('1H', 'S')).toEqual(NOTHING);
  });

  it('reads an opening bid', () => {
    expect(shown('1H P', 'N')).toEqual({
      minHcp: 12,
      maxHcp: 40,
      minLength: { C: 0, D: 0, H: 5, S: 0 },
    });
    expect(shown('1NT P', 'N')).toMatchObject({ minHcp: 15, maxHcp: 17 });
    expect(shown('1C P', 'N').minLength.C).toBe(2);
  });

  it('reads an opening pass', () => {
    expect(shown('P 1H', 'N')).toMatchObject({ minHcp: 0, maxHcp: 11 });
  });

  it('reads a response', () => {
    expect(shown('1H P 2H P', 'S')).toEqual({
      minHcp: 6,
      maxHcp: 9,
      minLength: { C: 0, D: 0, H: 3, S: 0 },
    });
    expect(shown('1H P 1S P', 'S')).toMatchObject({ minHcp: 6, maxHcp: 40 });
    expect(shown('1H P 1S P', 'S').minLength.S).toBe(4);
  });

  it('combines the opening and the rebid', () => {
    expect(shown('1D P 1H P 1NT P', 'N')).toMatchObject({ minHcp: 12, maxHcp: 14 });
    expect(shown('1H P 2H P 3H P', 'N')).toMatchObject({ minHcp: 16, maxHcp: 18 });
    expect(shown('1H P 1S P 2C P', 'N').minLength).toEqual({ C: 4, D: 0, H: 5, S: 0 });
  });

  it('learns nothing from a call without a matching rule', () => {
    expect(shown('1H P 3C P', 'S')).toEqual(NOTHING);
    expect(shown('1H 1S', 'E')).toEqual(NOTHING);
  });

  it('ignores rules from later lessons', () => {
    expect(shown('1NT P', 'N', 4)).toEqual(NOTHING);
  });
});
