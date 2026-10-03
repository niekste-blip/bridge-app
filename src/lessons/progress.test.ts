import { describe, expect, it } from 'vitest';
import {
  NO_PROGRESS,
  afterLesson,
  afterPractice,
  highestCompleted,
  isOpen,
  lessonPassed,
} from './progress';

describe('lessonPassed', () => {
  it('needs four out of five right at the first try', () => {
    expect(lessonPassed([true, true, true, true, false])).toBe(true);
    expect(lessonPassed([true, true, true, false, false])).toBe(false);
    expect(lessonPassed([])).toBe(false);
  });
});

describe('afterLesson', () => {
  it('marks a passed lesson as finished and remembers what went wrong', () => {
    const progress = afterLesson(NO_PROGRESS, 1, { a: true, b: true, c: true, d: true, e: false });
    expect(progress).toEqual({ completed: [1], trouble: [{ id: 'e', streak: 0 }] });
  });

  it('does not finish a failed lesson, but still remembers what went wrong', () => {
    const progress = afterLesson(NO_PROGRESS, 1, { a: false, b: false, c: true });
    expect(progress.completed).toEqual([]);
    expect(progress.trouble.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('keeps a finished lesson finished and does not list an exercise twice', () => {
    const first = afterLesson(NO_PROGRESS, 1, { a: true, b: true, c: true, d: true, e: false });
    const practised = afterPractice(first, 'e', true);
    const again = afterLesson(practised, 1, { a: false, b: false, c: false, d: false, e: false });
    expect(again.completed).toEqual([1]);
    expect(again.trouble.map((item) => item.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(again.trouble.find((item) => item.id === 'e')?.streak).toBe(0);
  });
});

describe('afterPractice', () => {
  const start = { completed: [1], trouble: [{ id: 'a', streak: 0 }, { id: 'b', streak: 0 }] };

  it('removes an exercise after two right answers in a row', () => {
    const once = afterPractice(start, 'a', true);
    expect(once.trouble).toEqual([{ id: 'a', streak: 1 }, { id: 'b', streak: 0 }]);
    expect(afterPractice(once, 'a', true).trouble).toEqual([{ id: 'b', streak: 0 }]);
  });

  it('starts counting again after a wrong answer', () => {
    const once = afterPractice(start, 'a', true);
    expect(afterPractice(once, 'a', false).trouble[0]).toEqual({ id: 'a', streak: 0 });
  });
});

describe('isOpen and highestCompleted', () => {
  it('opens the first lesson and the one after a finished lesson', () => {
    expect(isOpen(NO_PROGRESS, 1)).toBe(true);
    expect(isOpen(NO_PROGRESS, 2)).toBe(false);
    expect(isOpen({ completed: [1], trouble: [] }, 2)).toBe(true);
    expect(isOpen({ completed: [1], trouble: [] }, 3)).toBe(false);
    expect(isOpen(NO_PROGRESS, 7, true)).toBe(true);
  });

  it('gives the highest finished lesson', () => {
    expect(highestCompleted(NO_PROGRESS)).toBe(0);
    expect(highestCompleted({ completed: [1, 2, 4], trouble: [] })).toBe(4);
  });
});
