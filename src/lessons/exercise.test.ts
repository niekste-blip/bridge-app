import { describe, expect, it } from 'vitest';
import { bid, callText, cardId, isPlayComplete, legalCards, parseCard, playCard } from '../core';
import {
  bestPossible,
  bidAnswer,
  bidSetup,
  defenderCard,
  isRightCall,
  startPosition,
  studentToPlay,
  tricksForStudent,
} from './exercise';
import { type BidExercise, type PlayExercise } from './types';

const opening: BidExercise = { type: 'bid', id: 'x', hand: 'K42.Q73.AJ5.KQ62', dealer: 'N', auction: 'P P' };

const ending: PlayExercise = {
  type: 'play',
  id: 'y',
  intro: 'Speel.',
  trump: 'S',
  leader: 'S',
  hands: { N: 'S4 S3 S2 H2', E: 'SJ S5 DA DK', S: 'SA SK SQ HA', W: 'ST S6 CA CK' },
  target: 4,
  explanation: 'Uitleg.',
};

describe('bidding exercises', () => {
  it('seat the student after the calls so far', () => {
    const setup = bidSetup(opening);
    expect(setup.seat).toBe('S');
    expect(setup.hand).toHaveLength(13);
    expect(setup.auction.calls.map(callText)).toEqual(['P', 'P']);
  });

  it('use the rules up to the lesson of the exercise', () => {
    expect(callText(bidAnswer(opening, 4).call)).toBe('1C');
    expect(callText(bidAnswer(opening, 5).call)).toBe('1NT');
    expect(isRightCall(opening, 5, bid(1, 'NT'))).toBe(true);
    expect(isRightCall(opening, 5, bid(1, 'C'))).toBe(false);
  });
});

describe('play exercises', () => {
  it('start with South as declarer and the given leader', () => {
    const state = startPosition(ending);
    expect(state.declarer).toBe('S');
    expect(state.current.leader).toBe('S');
    expect(state.hands.S.map(cardId)).toEqual(['SA', 'SK', 'SQ', 'HA']);
    expect(studentToPlay(state)).toBe(true);
  });

  it('let the student play North and South, and a bot East and West', () => {
    const afterLead = playCard(startPosition(ending), parseCard('SA'));
    expect(studentToPlay(afterLead)).toBe(false);
    const reply = defenderCard(afterLead, 1);
    expect(legalCards(afterLead).map(cardId)).toContain(cardId(reply));
    expect(studentToPlay(playCard(afterLead, reply))).toBe(true);
  });

  it('know the best possible result', () => {
    expect(bestPossible(ending)).toBe(4);
  });

  it('count the tricks of the student, who loses one by cashing the ace of hearts first', () => {
    let state = startPosition(ending);
    const plan = ['HA', 'SA', 'SK', 'SQ'];
    while (!isPlayComplete(state)) {
      if (!studentToPlay(state)) {
        state = playCard(state, defenderCard(state, state.completed.length));
        continue;
      }
      const legal = legalCards(state);
      // The first card of the plan that may be played now
      const wanted = plan
        .map((id) => legal.find((card) => cardId(card) === id))
        .find((card) => card !== undefined);
      state = playCard(state, wanted ?? legal[0]);
    }
    expect(tricksForStudent(state)).toBe(3);
  });
});
