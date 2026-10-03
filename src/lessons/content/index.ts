import { type Lesson, parseLesson } from '../types';
import les01 from './les-01.json';
import les02 from './les-02.json';
import les03 from './les-03.json';
import les04 from './les-04.json';
import les05 from './les-05.json';
import les06 from './les-06.json';
import les07 from './les-07.json';

// The lessons in the order of the learning path
export const LESSONS: readonly Lesson[] = [les01, les02, les03, les04, les05, les06, les07].map(
  parseLesson,
);

export function lessonByNumber(number: number): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.number === number);
}
