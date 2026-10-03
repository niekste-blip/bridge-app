import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../game';
import { MAX_MOMENTS, reviewOf } from './review';
import { fourCardBoard } from './testing';

describe('reviewOf', () => {
  it('mentions a call that differs from the rules', () => {
    // South opened 1NT on 11 points
    const moments = reviewOf(fourCardBoard('cash'), DEFAULT_SETTINGS);
    expect(moments).toHaveLength(1);
    expect(moments[0].kind).toBe('call');
    expect(moments[0].text).toBe(
      'Bieden: u bood 1SA. Volgens de afspraken is het Pas: minder dan 12 punten, te weinig om te openen.',
    );
  });

  it('mentions a card that costs a trick or more', () => {
    const moments = reviewOf(fourCardBoard('blunder'), DEFAULT_SETTINGS);
    expect(moments.map((moment) => moment.kind)).toEqual(['call', 'card']);
    expect(moments[1].text).toMatch(
      /^Slag 2: u speelde ♦2\. Met ♠[AH] haalt u gemiddeld \d,\d slag meer\.$/,
    );
    expect(moments[1].weight).toBeGreaterThanOrEqual(1);
  });

  it('skips the card play when asked for no samples', () => {
    const moments = reviewOf(fourCardBoard('blunder'), DEFAULT_SETTINGS, { samples: 0 });
    expect(moments.map((moment) => moment.kind)).toEqual(['call']);
  });

  it('does not judge calls that a bot made for the user', () => {
    const game = fourCardBoard('cash');
    const byBots = { ...game, notes: game.notes.map((note) => note ?? '1SA: test.') };
    expect(reviewOf(byBots, DEFAULT_SETTINGS)).toEqual([]);
  });

  it('gives at most three moments, the most important first', () => {
    const moments = reviewOf(fourCardBoard('blunder'), DEFAULT_SETTINGS);
    expect(moments.length).toBeLessThanOrEqual(MAX_MOMENTS);
    const weights = moments.map((moment) => moment.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });
});
