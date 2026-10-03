import { describe, expect, it } from 'vitest';
import { cardId, seededRng } from '../core';
import { evaluateCards } from './simulate';
import { hands, position, viewAt } from './testing';

// South leads in no trump. The ace of spades first is at least one trick, and two when the king and
// queen fall together; the two first is at most one trick.
const view = viewAt(position(hands('H2 H3', 'SK D2', 'SA S2', 'SQ D3'), 'NT', 'S', 'S'));

describe('evaluateCards', () => {
  it('gives the average number of tricks for every legal card', () => {
    const evaluations = evaluateCards(view, { samples: 20, rng: seededRng(1) });
    const byCard = Object.fromEntries(evaluations.map((e) => [cardId(e.card), e.average]));
    expect(Object.keys(byCard).sort()).toEqual(['S2', 'SA']);
    expect(byCard.SA).toBeGreaterThanOrEqual(1);
    expect(byCard.SA).toBeLessThanOrEqual(2);
    expect(byCard.S2).toBeLessThan(byCard.SA);
  });

  it('gives the same result for the same random numbers', () => {
    const a = evaluateCards(view, { samples: 10, rng: seededRng(5) });
    const b = evaluateCards(view, { samples: 10, rng: seededRng(5) });
    expect(a).toEqual(b);
  });

  it('stops early when the time budget is used up', () => {
    const count = (budgetMs?: number) => {
      let calls = 0;
      let clock = 0;
      const rng = seededRng(1);
      evaluateCards(view, {
        samples: 50,
        rng: () => {
          calls++;
          return rng();
        },
        budgetMs,
        now: () => (clock += 1000),
      });
      return calls;
    };
    expect(count(500)).toBeLessThan(count());
    expect(count(500)).toBeGreaterThan(0);
  });
});
