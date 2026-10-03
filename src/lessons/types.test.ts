import { describe, expect, it } from 'vitest';
import { parseLesson } from './types';

const page = { title: 'Titel', text: 'Tekst.' };
const choice = {
  type: 'choice',
  id: 'a',
  question: 'Vraag?',
  options: ['een', 'twee'],
  answer: 1,
  explanation: 'Uitleg.',
};
const lesson = (extra: object = {}) => ({
  number: 1,
  title: 'Les',
  goal: 'Doel.',
  pages: [page],
  exercises: [choice],
  ...extra,
});

describe('parseLesson', () => {
  it('accepts a lesson with every kind of exercise', () => {
    const parsed = parseLesson(
      lesson({
        pages: [{ ...page, hand: 'AKJ52.Q73.K4.862' }],
        exercises: [
          choice,
          { type: 'bid', id: 'b', hand: 'AKJ52.Q73.K4.862', dealer: 'N', auction: '' },
          {
            type: 'play',
            id: 'c',
            intro: 'Speel.',
            trump: 'NT',
            leader: 'S',
            hands: { N: 'SA', E: 'S2', S: 'SK', W: 'S3' },
            target: 1,
            explanation: 'Uitleg.',
          },
        ],
      }),
    );
    expect(parsed.exercises.map((exercise) => exercise.type)).toEqual(['choice', 'bid', 'play']);
    expect(parsed.pages[0].hand).toBe('AKJ52.Q73.K4.862');
  });

  it('names the lesson and the exercise in an error', () => {
    const broken = lesson({ exercises: [{ ...choice, answer: 5 }] });
    expect(() => parseLesson(broken)).toThrow('lesson 1 exercise 1 (a): "answer" must point at one of the options');
  });

  it('rejects missing or wrong fields', () => {
    expect(() => parseLesson(null)).toThrow();
    expect(() => parseLesson(lesson({ title: '' }))).toThrow('"title"');
    expect(() => parseLesson(lesson({ pages: [] }))).toThrow('"pages"');
    expect(() => parseLesson(lesson({ exercises: [{ ...choice, type: 'quiz' }] }))).toThrow('"type"');
    expect(() =>
      parseLesson(lesson({ exercises: [{ type: 'bid', id: 'b', hand: 'x', dealer: 'Q', auction: '' }] })),
    ).toThrow('"dealer"');
  });
});
