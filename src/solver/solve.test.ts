import { describe, expect, it } from 'vitest';
import {
  type Card,
  type Contract,
  type Deal,
  type PlayState,
  type Strain,
  cardId,
  fullDeck,
  isPlayComplete,
  legalCards,
  parseCard,
  playCard,
  seatToPlay,
  seededRng,
  sideOf,
  startPlay,
} from '../core';
import { bestTricks, solve } from './index';

// A random ending with `size` cards in each hand
function ending(seed: number, size: number): Deal {
  const rng = seededRng(seed);
  const deck = fullDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    N: deck.slice(0, size),
    E: deck.slice(size, 2 * size),
    S: deck.slice(2 * size, 3 * size),
    W: deck.slice(3 * size, 4 * size),
  };
}

function contract(strain: Strain, declarer: Contract['declarer']): Contract {
  return { level: 1, strain, doubling: 'none', declarer };
}

// Plain minimax through the core play functions: tricks for North-South from here
function bruteForce(state: PlayState): number {
  if (isPlayComplete(state)) return 0;
  const northSouth = sideOf(seatToPlay(state)) === 'NS';
  let best = northSouth ? -1 : 99;
  for (const card of legalCards(state)) {
    const next = playCard(state, card);
    const finished = next.completed.length > state.completed.length;
    const won = finished && sideOf(next.completed[next.completed.length - 1].winner) === 'NS' ? 1 : 0;
    const value = won + bruteForce(next);
    best = northSouth ? Math.max(best, value) : Math.min(best, value);
  }
  return best;
}

// The same number from the point of view of the player to move, for one card
function expected(state: PlayState, card: Card): number {
  const next = playCard(state, card);
  const finished = next.completed.length > state.completed.length;
  const won = finished && sideOf(next.completed[next.completed.length - 1].winner) === 'NS' ? 1 : 0;
  const northSouthTricks = won + bruteForce(next);
  const left = state.hands[seatToPlay(state)].length;
  return sideOf(seatToPlay(state)) === 'NS' ? northSouthTricks : left - northSouthTricks;
}

const cards = (...ids: string[]) => ids.map(parseCard);

describe('solve', () => {
  it('counts top tricks in no trump', () => {
    const deal: Deal = {
      N: cards('SA', 'SK', 'H2'),
      E: cards('SQ', 'SJ', 'HA'),
      S: cards('S2', 'S3', 'H3'),
      W: cards('S4', 'S5', 'HK'),
    };
    // West is declarer, so North leads: two spades, then the hearts are lost
    const results = solve(startPlay(deal, contract('NT', 'W')));
    const byCard = Object.fromEntries(results.map((r) => [cardId(r.card), r.tricks]));
    expect(byCard).toEqual({ SA: 2, SK: 2, H2: 2 });
  });

  it('sees a ruff', () => {
    const deal: Deal = {
      N: cards('SA', 'SK'),
      E: cards('S2', 'S3'),
      S: cards('H2', 'H3'),
      W: cards('S4', 'C2'),
    };
    // West is declarer, North leads. With clubs as trumps West ruffs the second spade.
    expect(bestTricks(startPlay(deal, contract('NT', 'W')))).toBe(2);
    expect(bestTricks(startPlay(deal, contract('C', 'W')))).toBe(1);
  });

  it('gives a result for every legal card', () => {
    const state = startPlay(ending(1, 5), contract('H', 'N'));
    expect(solve(state).map((r) => cardId(r.card))).toEqual(legalCards(state).map(cardId));
  });

  it('does not change the state', () => {
    const state = startPlay(ending(2, 5), contract('S', 'E'));
    const before = JSON.stringify(state);
    solve(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('matches plain minimax on random four-card endings', () => {
    const strains: Strain[] = ['NT', 'S', 'H', 'D', 'C'];
    for (let seed = 1; seed <= 40; seed++) {
      const strain = strains[seed % strains.length];
      const declarer = (['N', 'E', 'S', 'W'] as const)[seed % 4];
      const state = startPlay(ending(seed, 4), contract(strain, declarer));
      for (const result of solve(state)) {
        expect(result.tricks, `seed ${seed} ${cardId(result.card)}`).toBe(expected(state, result.card));
      }
    }
  });

  it('matches plain minimax in the middle of a trick', () => {
    for (let seed = 41; seed <= 70; seed++) {
      let state = startPlay(ending(seed, 4), contract(seed % 2 ? 'NT' : 'C', 'S'));
      const cardsPlayed = 1 + (seed % 6); // stops inside the first or the second trick
      for (let i = 0; i < cardsPlayed; i++) {
        const options = legalCards(state);
        state = playCard(state, options[seed % options.length]);
      }
      for (const result of solve(state)) {
        expect(result.tricks, `seed ${seed} ${cardId(result.card)}`).toBe(expected(state, result.card));
      }
    }
  });

  it('solves eight-card endings quickly', () => {
    const start = performance.now();
    for (let seed = 1; seed <= 10; seed++) {
      solve(startPlay(ending(seed, 8), contract(seed % 2 ? 'NT' : 'S', 'S')));
    }
    expect(performance.now() - start).toBeLessThan(5000);
  });
});
