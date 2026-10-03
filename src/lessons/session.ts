import { type Exercise, type Lesson } from './types';

// One run through the pages and exercises of a lesson, or through the practice list
export interface Session {
  // The lesson being followed, or null for the practice list
  readonly lessonNumber: number | null;
  readonly title: string;
  readonly pages: Lesson['pages'];
  // Index of the page being read; equal to pages.length once the exercises have started
  readonly page: number;
  // Exercises still to answer right, the current one first
  readonly queue: readonly Exercise[];
  // Per exercise: whether the first answer was right
  readonly firstTries: Readonly<Record<string, boolean>>;
  // Lesson number of every exercise, needed to check a bid
  readonly lessonOf: Readonly<Record<string, number>>;
  readonly total: number;
  // Number of answers given; an exercise that comes back is shown as a fresh one
  readonly attempts: number;
}

export type Stage = 'pages' | 'exercises' | 'done';

export function lessonSession(lesson: Lesson): Session {
  return {
    lessonNumber: lesson.number,
    title: `Les ${lesson.number}: ${lesson.title}`,
    pages: lesson.pages,
    page: 0,
    queue: lesson.exercises,
    firstTries: {},
    lessonOf: Object.fromEntries(lesson.exercises.map((exercise) => [exercise.id, lesson.number])),
    total: lesson.exercises.length,
    attempts: 0,
  };
}

// A session over the exercises with these ids, taken from all lessons
export function practiceSession(lessons: readonly Lesson[], ids: readonly string[]): Session {
  const found = lessons.flatMap((lesson) =>
    lesson.exercises
      .filter((exercise) => ids.includes(exercise.id))
      .map((exercise) => ({ exercise, lessonNumber: lesson.number })),
  );
  return {
    lessonNumber: null,
    title: 'Oefen wat ik lastig vond',
    pages: [],
    page: 0,
    queue: found.map((item) => item.exercise),
    firstTries: {},
    lessonOf: Object.fromEntries(found.map((item) => [item.exercise.id, item.lessonNumber])),
    total: found.length,
    attempts: 0,
  };
}

export function stageOf(session: Session): Stage {
  if (session.page < session.pages.length) return 'pages';
  return session.queue.length > 0 ? 'exercises' : 'done';
}

export function nextPage(session: Session): Session {
  return stageOf(session) === 'pages' ? { ...session, page: session.page + 1 } : session;
}

export function previousPage(session: Session): Session {
  return session.page > 0 && stageOf(session) === 'pages'
    ? { ...session, page: session.page - 1 }
    : session;
}

export function currentExercise(session: Session): Exercise | null {
  return stageOf(session) === 'exercises' ? session.queue[0] : null;
}

// Records the answer to the current exercise. A wrong answer sends the exercise to the back of the
// queue, so it comes back later in the same session.
export function answered(session: Session, right: boolean): Session {
  const exercise = currentExercise(session);
  if (!exercise) return session;
  const firstTries =
    exercise.id in session.firstTries
      ? session.firstTries
      : { ...session.firstTries, [exercise.id]: right };
  const rest = session.queue.slice(1);
  return {
    ...session,
    firstTries,
    queue: right ? rest : [...rest, exercise],
    attempts: session.attempts + 1,
  };
}

export function rightAtFirstTry(session: Session): number {
  return Object.values(session.firstTries).filter(Boolean).length;
}
