import { describe, expect, it } from 'vitest';
import { type Contract, type Strain } from './auction';
import { cardId, parseCard } from './cards';
import { type Deal } from './deal';
import {
  dummyOf,
  isPlayComplete,
  legalCards,
  playCard,
  seatToPlay,
  startPlay,
  trickWinner,
  tricksWon,
} from './play';

const cards = (...ids: string[]) => ids.map(parseCard);

// Two cards each; West has no hearts
const deal: Deal = {
  N: cards('SA', 'H2'),
  E: cards('SK', 'H3'),
  S: cards('S2', 'HA'),
  W: cards('S3', 'D2'),
};

function contract(strain: Strain): Contract {
  return { level: 1, strain, doubling: 'none', declarer: 'S' };
}

function playAll(strain: Strain, ...ids: string[]) {
  return ids.reduce((state, id) => playCard(state, parseCard(id)), startPlay(deal, contract(strain)));
}

describe('startPlay', () => {
  it('lets the player left of declarer lead', () => {
    const state = startPlay(deal, contract('NT'));
    expect(seatToPlay(state)).toBe('W');
    expect(dummyOf(state)).toBe('N');
    expect(isPlayComplete(state)).toBe(false);
  });

  it('puts dummy opposite a declarer other than South', () => {
    const state = startPlay(deal, { level: 1, strain: 'NT', doubling: 'none', declarer: 'E' });
    expect(dummyOf(state)).toBe('W');
    expect(seatToPlay(state)).toBe('S');
  });
});

describe('legalCards', () => {
  it('allows any card on lead', () => {
    const state = startPlay(deal, contract('NT'));
    expect(legalCards(state).map(cardId)).toEqual(['S3', 'D2']);
  });

  it('requires following suit', () => {
    const state = playAll('NT', 'S3');
    expect(seatToPlay(state)).toBe('N');
    expect(legalCards(state).map(cardId)).toEqual(['SA']);
  });

  it('allows any card when unable to follow', () => {
    const state = playAll('NT', 'S3', 'SA', 'SK', 'S2', 'H2', 'H3', 'HA');
    expect(seatToPlay(state)).toBe('W');
    expect(legalCards(state).map(cardId)).toEqual(['D2']);
  });
});

describe('playCard', () => {
  it('rejects a card that does not follow suit', () => {
    const state = playAll('NT', 'S3');
    expect(() => playCard(state, parseCard('H2'))).toThrow();
  });

  it('rejects a card that is not in the hand', () => {
    const state = startPlay(deal, contract('NT'));
    expect(() => playCard(state, parseCard('SA'))).toThrow();
  });

  it('does not change the original state', () => {
    const state = startPlay(deal, contract('NT'));
    playCard(state, parseCard('S3'));
    expect(state.hands.W).toHaveLength(2);
    expect(state.current.cards).toHaveLength(0);
  });

  it('gives the lead to the winner of the trick', () => {
    const state = playAll('NT', 'S3', 'SA', 'SK', 'S2');
    expect(state.completed).toHaveLength(1);
    expect(state.completed[0].winner).toBe('N');
    expect(seatToPlay(state)).toBe('N');
    expect(tricksWon(state, 'NS')).toBe(1);
    expect(tricksWon(state, 'EW')).toBe(0);
  });

  it('rejects a card after the deal is complete', () => {
    const state = playAll('NT', 'S3', 'SA', 'SK', 'S2', 'H2', 'H3', 'HA', 'D2');
    expect(() => playCard(state, parseCard('SA'))).toThrow();
  });

  it('plays a whole deal in no trump', () => {
    const state = playAll('NT', 'S3', 'SA', 'SK', 'S2', 'H2', 'H3', 'HA', 'D2');
    expect(isPlayComplete(state)).toBe(true);
    expect(tricksWon(state, 'NS')).toBe(2);
    expect(tricksWon(state, 'EW')).toBe(0);
    expect(legalCards(state)).toEqual([]);
  });

  it('lets a trump win the trick', () => {
    const state = playAll('D', 'S3', 'SA', 'SK', 'S2', 'H2', 'H3', 'HA', 'D2');
    expect(state.completed[1].winner).toBe('W');
    expect(tricksWon(state, 'NS')).toBe(1);
    expect(tricksWon(state, 'EW')).toBe(1);
  });
});

describe('trickWinner', () => {
  const trick = { leader: 'N' as const, cards: cards('H2', 'SA', 'H3', 'H4') };

  it('ignores a discard in no trump', () => {
    expect(trickWinner(trick, 'NT')).toBe('W');
  });

  it('lets the highest trump win', () => {
    expect(trickWinner(trick, 'S')).toBe('E');
    expect(trickWinner({ leader: 'E', cards: cards('H2', 'S3', 'S9', 'HA') }, 'S')).toBe('W');
  });

  it('lets a higher trump overtrump a lower trump', () => {
    expect(trickWinner({ leader: 'N', cards: cards('H2', 'S3', 'S9', 'H4') }, 'S')).toBe('S');
  });

  it('lets the highest card of the suit led win when trumps are led', () => {
    expect(trickWinner({ leader: 'S', cards: cards('S5', 'SQ', 'S6', 'HA') }, 'S')).toBe('W');
  });
});
