import { describe, expect, it } from 'vitest';
import {
  type Contract,
  cardId,
  dealCards,
  legalCards,
  newAuction,
  playCard,
  seededRng,
  startPlay,
} from '../core';
import { handToPlay, hiddenSeats, legalCardsFor, viewOfPlay } from './view';

const contract: Contract = { level: 3, strain: 'NT', doubling: 'none', declarer: 'S' };
const auction = newAuction('N');
const deal = dealCards(seededRng(1));

describe('viewOfPlay', () => {
  it('shows only the own hand before the opening lead', () => {
    const view = viewOfPlay(startPlay(deal, contract), auction);
    expect(view.seat).toBe('W');
    expect(view.actor).toBe('W');
    expect(view.dummy).toBe('N');
    expect(Object.keys(view.hands)).toEqual(['W']);
    expect(hiddenSeats(view)).toEqual(['N', 'E', 'S']);
    expect(view.unseen).toHaveLength(39);
    expect(handToPlay(view)).toEqual(deal.W);
  });

  it('can show dummy before a card is played, for practice positions', () => {
    const view = viewOfPlay(startPlay(deal, contract), auction, true);
    expect(Object.keys(view.hands).sort()).toEqual(['N', 'W']);
    expect(view.unseen).toHaveLength(26);
  });

  it('lets declarer play the cards of dummy', () => {
    const afterLead = playCard(startPlay(deal, contract), deal.W[0]);
    const view = viewOfPlay(afterLead, auction);
    expect(view.seat).toBe('N');
    expect(view.actor).toBe('S');
    expect(Object.keys(view.hands).sort()).toEqual(['N', 'S']);
    expect(hiddenSeats(view)).toEqual(['E', 'W']);
    expect(view.unseen).toHaveLength(25);
    expect(handToPlay(view)).toEqual(deal.N);
  });

  it('shows dummy to the defenders after the opening lead', () => {
    let state = playCard(startPlay(deal, contract), deal.W[0]);
    state = playCard(state, legalCards(state)[0]);
    const view = viewOfPlay(state, auction);
    expect(view.seat).toBe('E');
    expect(Object.keys(view.hands).sort()).toEqual(['E', 'N']);
    expect(hiddenSeats(view)).toEqual(['S', 'W']);
  });

  it('is the same whichever hidden hand holds a card', () => {
    let state = playCard(startPlay(deal, contract), deal.W[0]);
    state = playCard(state, legalCards(state)[0]);
    // East is to play; South and West are hidden. Swap one card between them.
    const south = [...state.hands.S];
    const west = [...state.hands.W];
    [south[0], west[0]] = [west[0], south[0]];
    const swapped = { ...state, hands: { ...state.hands, S: south, W: west } };
    expect(viewOfPlay(swapped, auction)).toEqual(viewOfPlay(state, auction));
  });
});

describe('legalCardsFor', () => {
  it('agrees with the rules of play all the way through a deal', () => {
    let state = startPlay(deal, contract);
    for (let turn = 0; turn < 52; turn++) {
      const legal = legalCards(state);
      expect(legalCardsFor(viewOfPlay(state, auction)).map(cardId)).toEqual(legal.map(cardId));
      state = playCard(state, legal[turn % legal.length]);
    }
  });
});
