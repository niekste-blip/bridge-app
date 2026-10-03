import { describe, expect, it } from 'vitest';
import { LESSONS } from './content';
import {
  answered,
  currentExercise,
  lessonSession,
  nextPage,
  practiceSession,
  previousPage,
  rightAtFirstTry,
  stageOf,
} from './session';

const lesson = LESSONS[0];

function throughPages() {
  let session = lessonSession(lesson);
  while (stageOf(session) === 'pages') session = nextPage(session);
  return session;
}

describe('a lesson session', () => {
  it('starts with the pages', () => {
    const session = lessonSession(lesson);
    expect(session.title).toBe('Les 1: Bridge in vogelvlucht');
    expect(stageOf(session)).toBe('pages');
    expect(currentExercise(session)).toBeNull();
    expect(previousPage(session)).toBe(session);
    expect(previousPage(nextPage(session)).page).toBe(0);
  });

  it('goes on to the exercises after the last page', () => {
    const session = throughPages();
    expect(stageOf(session)).toBe('exercises');
    expect(currentExercise(session)).toBe(lesson.exercises[0]);
    expect(nextPage(session)).toBe(session);
  });

  it('moves on after a right answer', () => {
    const session = answered(throughPages(), true);
    expect(currentExercise(session)).toBe(lesson.exercises[1]);
    expect(session.firstTries).toEqual({ [lesson.exercises[0].id]: true });
  });

  it('brings a wrongly answered exercise back at the end', () => {
    let session = answered(throughPages(), false);
    const first = lesson.exercises[0];
    expect(currentExercise(session)).toBe(lesson.exercises[1]);
    expect(session.queue.at(-1)).toBe(first);
    while (currentExercise(session) !== first) session = answered(session, true);
    session = answered(session, true);
    expect(stageOf(session)).toBe('done');
    // The second, right answer does not change the first try
    expect(session.firstTries[first.id]).toBe(false);
    expect(rightAtFirstTry(session)).toBe(lesson.exercises.length - 1);
  });

  it('counts every answer, so that a repeated exercise can be told apart', () => {
    let session = throughPages();
    while (session.queue.length > 1) session = answered(session, true);
    const last = currentExercise(session);
    const once = answered(session, false);
    const twice = answered(once, false);
    expect(currentExercise(once)).toBe(last);
    expect(currentExercise(twice)).toBe(last);
    expect(new Set([session.attempts, once.attempts, twice.attempts]).size).toBe(3);
  });

  it('ignores an answer when there is no exercise', () => {
    const session = lessonSession(lesson);
    expect(answered(session, true)).toBe(session);
  });
});

describe('a practice session', () => {
  it('collects exercises from all lessons and remembers their lesson', () => {
    const ids = ['l1-down', 'l5-antwoord-2sa'];
    const session = practiceSession(LESSONS, ids);
    expect(session.lessonNumber).toBeNull();
    expect(session.queue.map((exercise) => exercise.id)).toEqual(ids);
    expect(session.lessonOf).toEqual({ 'l1-down': 1, 'l5-antwoord-2sa': 5 });
    expect(stageOf(session)).toBe('exercises');
  });

  it('is done at once when nothing is listed', () => {
    expect(stageOf(practiceSession(LESSONS, []))).toBe('done');
  });
});
