// What the student has finished and which exercises still need practice

export interface Trouble {
  readonly id: string;
  // Times in a row this exercise was answered right in practice
  readonly streak: number;
}

export interface Progress {
  // Numbers of the finished lessons
  readonly completed: readonly number[];
  readonly trouble: readonly Trouble[];
}

export const NO_PROGRESS: Progress = { completed: [], trouble: [] };

// Share of exercises that must be right at the first try to finish a lesson
export const PASS_SHARE = 0.8;
// An exercise leaves the practice list after this many right answers in a row
export const STREAK_TO_CLEAR = 2;

export function lessonPassed(firstTries: readonly boolean[]): boolean {
  if (firstTries.length === 0) return false;
  const right = firstTries.filter(Boolean).length;
  return right / firstTries.length >= PASS_SHARE;
}

export function highestCompleted(progress: Progress): number {
  return progress.completed.reduce((highest, number) => Math.max(highest, number), 0);
}

// A lesson is open when it is the first one, or when the lesson before it is finished
export function isOpen(progress: Progress, lessonNumber: number, unlockAll = false): boolean {
  return unlockAll || lessonNumber === 1 || progress.completed.includes(lessonNumber - 1);
}

// After a lesson: mark it finished when passed, and remember the exercises that went wrong
export function afterLesson(
  progress: Progress,
  lessonNumber: number,
  firstTries: Readonly<Record<string, boolean>>,
): Progress {
  const passed = lessonPassed(Object.values(firstTries));
  const completed =
    passed && !progress.completed.includes(lessonNumber)
      ? [...progress.completed, lessonNumber].sort((a, b) => a - b)
      : progress.completed;
  const wrong = Object.keys(firstTries).filter((id) => !firstTries[id]);
  const known = new Set(progress.trouble.map((item) => item.id));
  const trouble = [
    ...progress.trouble.map((item) => (wrong.includes(item.id) ? { ...item, streak: 0 } : item)),
    ...wrong.filter((id) => !known.has(id)).map((id) => ({ id, streak: 0 })),
  ];
  return { completed, trouble };
}

// After practising one exercise from the list
export function afterPractice(progress: Progress, id: string, right: boolean): Progress {
  const trouble = progress.trouble
    .map((item) => (item.id === id ? { ...item, streak: right ? item.streak + 1 : 0 } : item))
    .filter((item) => item.streak < STREAK_TO_CLEAR);
  return { ...progress, trouble };
}
