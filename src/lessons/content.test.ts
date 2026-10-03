import { describe, expect, it } from 'vitest';
import { callText, cardId, isPlayComplete, legalCards, parseCard, parseHand, playCard } from '../core';
import { ALL_RULES } from '../bidding';
import { LESSONS } from './content';
import {
  bestPossible,
  bidAnswer,
  defenderCard,
  startPosition,
  studentToPlay,
  tricksForStudent,
} from './exercise';

const exercises = LESSONS.flatMap((lesson) =>
  lesson.exercises.map((exercise) => ({ lesson, exercise })),
);

describe('the lessons', () => {
  it('are numbered 1 to 7 in order', () => {
    expect(LESSONS.map((lesson) => lesson.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('each have three to five pages and five to ten exercises', () => {
    for (const lesson of LESSONS) {
      expect(lesson.pages.length, `lesson ${lesson.number} pages`).toBeGreaterThanOrEqual(3);
      expect(lesson.pages.length, `lesson ${lesson.number} pages`).toBeLessThanOrEqual(5);
      expect(lesson.exercises.length, `lesson ${lesson.number} exercises`).toBeGreaterThanOrEqual(5);
      expect(lesson.exercises.length, `lesson ${lesson.number} exercises`).toBeLessThanOrEqual(10);
    }
  });

  it('have unique exercise ids', () => {
    const ids = exercises.map(({ exercise }) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('show only complete hands of thirteen cards', () => {
    const shown = [
      ...LESSONS.flatMap((lesson) => lesson.pages.map((page) => page.hand)),
      ...exercises.map(({ exercise }) => (exercise.type === 'play' ? undefined : exercise.hand)),
    ].filter((hand): hand is string => hand !== undefined);
    for (const hand of shown) {
      const cards = parseHand(hand);
      expect(cards, hand).toHaveLength(13);
      expect(new Set(cards.map((card) => card.suit + card.rank)).size, hand).toBe(13);
    }
  });
});

describe('bidding exercises', () => {
  const bids = exercises.flatMap(({ lesson, exercise }) =>
    exercise.type === 'bid' ? [{ lesson, exercise }] : [],
  );

  it('are answered by a rule the student has learned', () => {
    for (const { lesson, exercise } of bids) {
      const answer = bidAnswer(exercise, lesson.number);
      expect(answer.source, exercise.id).toBe('rule');
      const rule = ALL_RULES.find((candidate) => candidate.id === answer.ruleId);
      expect(rule && rule.lesson <= lesson.number, exercise.id).toBe(true);
    }
  });

  it('have the intended answers', () => {
    const answers = Object.fromEntries(
      bids.map(({ lesson, exercise }) => [exercise.id, callText(bidAnswer(exercise, lesson.number).call)]),
    );
    expect(answers).toEqual({
      'l4-open-1s': '1S',
      'l4-open-1h': '1H',
      'l4-open-1d': '1D',
      'l4-open-1c': '1C',
      'l4-pas': 'P',
      'l4-twee-vijfkaarten': '1S',
      'l4-na-passen': '1D',
      'l5-open-1sa': '1NT',
      'l5-open-1sa-vijfkaart': '1NT',
      'l5-antwoord-pas': 'P',
      'l5-antwoord-2s': '2S',
      'l5-antwoord-2sa': '2NT',
      'l5-antwoord-3sa': '3NT',
      'l5-antwoord-3s': '3S',
      'l5-antwoord-4s': '4S',
      'l5-herbieding-pas': 'P',
      'l5-herbieding-4s': '4S',
      'l6-pas': 'P',
      'l6-steun-2h': '2H',
      'l6-steun-3h': '3H',
      'l6-steun-4h': '4H',
      'l6-nieuwe-kleur-1s': '1S',
      'l6-1sa': '1NT',
      'l6-2-niveau': '2D',
      'l6-2h-vijfkaart': '2H',
      'l6-laagste-eerst': '1H',
      'l6-2sa': '2NT',
      'l7-na-steun-pas': 'P',
      'l7-na-steun-uitnodigen': '3H',
      'l7-na-steun-manche': '4H',
      'l7-uitnodiging-aannemen': '4H',
      'l7-steun-partner': '2S',
      'l7-1sa': '1NT',
      'l7-zeskaart': '2H',
      'l7-tweede-kleur': '2C',
      'l7-nieuwe-kleur-1-niveau': '1S',
      'l7-na-1sa-pas': 'P',
    });
  });
});

describe('play exercises', () => {
  const plays = exercises.flatMap(({ exercise }) => (exercise.type === 'play' ? [exercise] : []));

  it('give every seat the same number of different cards', () => {
    for (const exercise of plays) {
      const state = startPosition(exercise);
      const sizes = [state.hands.N, state.hands.E, state.hands.S, state.hands.W].map((hand) => hand.length);
      expect(new Set(sizes).size, exercise.id).toBe(1);
      const all = Object.values(exercise.hands).flatMap((text) => text.split(' ').map(parseCard));
      expect(new Set(all.map((card) => card.suit + card.rank)).size, exercise.id).toBe(all.length);
    }
  });

  it('punish the wrong order in the exercise about the short hand', () => {
    const exercise = plays.find((candidate) => candidate.id === 'l2-korte-hand');
    if (!exercise) throw new Error('exercise not found');
    // Small heart to the ace first: the king then blocks the suit
    const wrongOrder = ['H2', 'HA', 'HQ', 'HK'];
    let state = startPosition(exercise);
    while (!isPlayComplete(state)) {
      const legal = legalCards(state);
      const planned = wrongOrder
        .map((id) => legal.find((card) => cardId(card) === id))
        .find((card) => card !== undefined);
      state = playCard(state, studentToPlay(state) ? (planned ?? legal[0]) : defenderCard(state, 1));
    }
    expect(tricksForStudent(state)).toBeLessThan(exercise.target);
  });

  it('ask for exactly what can be made against the best defence', () => {
    for (const exercise of plays) {
      expect(bestPossible(exercise), exercise.id).toBe(exercise.target);
    }
  });
});
