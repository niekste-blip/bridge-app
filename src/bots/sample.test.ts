import { describe, expect, it } from 'vitest';
import {
  type Contract,
  type Deal,
  SEATS,
  cardId,
  dealCards,
  highCardPoints,
  legalCards,
  newAuction,
  playCard,
  seededRng,
  startPlay,
} from '../core';
import { cardsPlayedBy, knownVoids, sampleDeal } from './sample';
import { hands, play, position, viewAt } from './testing';
import { hiddenSeats, viewOfPlay } from './view';

const contract: Contract = { level: 3, strain: 'NT', doubling: 'none', declarer: 'S' };
const ids = (cards: readonly { suit: string; rank: number }[]) =>
  cards.map((card) => cardId(card as never)).sort();

function midDeal(seed: number, cardsPlayed: number) {
  const deal = dealCards(seededRng(seed));
  let state = startPlay(deal, contract);
  for (let i = 0; i < cardsPlayed; i++) {
    const legal = legalCards(state);
    state = playCard(state, legal[(seed + i) % legal.length]);
  }
  return state;
}

describe('cardsPlayedBy and knownVoids', () => {
  const start = position(hands('S2 D7', 'H8 D4', 'SA D9', 'S3 D6'), 'NT', 'S', 'W');
  const view = viewAt(play(start, 'S3', 'S2', 'H8'));

  it('lists the cards each seat played', () => {
    const played = cardsPlayedBy(view);
    expect(ids(played.W)).toEqual(['S3']);
    expect(ids(played.N)).toEqual(['S2']);
    expect(ids(played.E)).toEqual(['H8']);
    expect(played.S).toEqual([]);
  });

  it('notes who failed to follow suit', () => {
    const voids = knownVoids(view);
    expect([...voids.E]).toEqual(['S']);
    expect(voids.N.size + voids.S.size + voids.W.size).toBe(0);
  });
});

describe('sampleDeal', () => {
  it('keeps the visible hands and deals the unseen cards over the hidden seats', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = midDeal(seed, 5 + seed);
      const view = viewOfPlay(state, newAuction('N'));
      const sample = sampleDeal(view, seededRng(seed));
      const hidden = hiddenSeats(view);
      for (const seat of SEATS) {
        if (hidden.includes(seat)) {
          expect(sample[seat]).toHaveLength(state.hands[seat].length);
        } else {
          expect(sample[seat]).toEqual(state.hands[seat]);
        }
      }
      expect(ids(hidden.flatMap((seat) => sample[seat]))).toEqual(ids(view.unseen));
    }
  });

  it('gives different deals for different random numbers', () => {
    const view = viewOfPlay(midDeal(3, 6), newAuction('N'));
    const a = sampleDeal(view, seededRng(1));
    const b = sampleDeal(view, seededRng(2));
    expect(a).not.toEqual(b);
  });

  it('never gives a seat a suit it has shown out of', () => {
    // East discarded on the spade lead, so East has no spades
    const deal: Deal = hands('S2 D7 C2', 'H8 D4 C3', 'SA D9 C4', 'S3 S6 D6');
    const state = play(position(deal, 'NT', 'S', 'W'), 'S3', 'S2', 'H8', 'SA', 'D9');
    const view = viewOfPlay(state, newAuction('N'));
    expect(hiddenSeats(view)).toEqual(['E', 'S']);
    for (let seed = 1; seed <= 30; seed++) {
      const sample = sampleDeal(view, seededRng(seed));
      expect(sample.E.some((card) => card.suit === 'S')).toBe(false);
    }
  });

  it('respects what a hidden player showed in the bidding', () => {
    const state = midDeal(7, 9);
    const view = viewOfPlay(state, newAuction('N'));
    const [first] = hiddenSeats(view);
    const played = cardsPlayedBy(view)[first];
    const limits = { [first]: { minHcp: 12, maxHcp: 40, minLength: { C: 0, D: 0, H: 0, S: 0 } } };
    for (let seed = 1; seed <= 30; seed++) {
      const sample = sampleDeal(view, seededRng(seed), limits, 200);
      expect(highCardPoints([...sample[first], ...played])).toBeGreaterThanOrEqual(12);
    }
  });

  it('still returns a deal when the limits cannot be met', () => {
    const view = viewOfPlay(midDeal(7, 9), newAuction('N'));
    const [first] = hiddenSeats(view);
    const limits = { [first]: { minHcp: 38, maxHcp: 40, minLength: { C: 0, D: 0, H: 0, S: 0 } } };
    const sample = sampleDeal(view, seededRng(1), limits);
    expect(ids(hiddenSeats(view).flatMap((seat) => sample[seat]))).toEqual(ids(view.unseen));
  });
});
