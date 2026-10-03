import { SEATS, STRAINS, type Seat, type Strain } from '../core';

// A question with a few answers to choose from
export interface ChoiceExercise {
  readonly type: 'choice';
  readonly id: string;
  readonly question: string;
  // A hand to show with the question, as spades.hearts.diamonds.clubs
  readonly hand?: string;
  readonly options: readonly string[];
  // Index of the right option
  readonly answer: number;
  readonly explanation: string;
}

// A hand and an auction; the right call is what the bidding rules of the lesson prescribe
export interface BidExercise {
  readonly type: 'bid';
  readonly id: string;
  readonly hand: string;
  readonly dealer: Seat;
  // The calls so far, for example '1H P'; the student is the next to call
  readonly auction: string;
}

// A small position that South plays as declarer with North as dummy
export interface PlayExercise {
  readonly type: 'play';
  readonly id: string;
  readonly intro: string;
  readonly trump: Strain;
  readonly leader: Seat;
  // Cards per seat, for example 'SA SK H3'
  readonly hands: Readonly<Record<Seat, string>>;
  // Tricks North-South must take
  readonly target: number;
  readonly explanation: string;
}

export type Exercise = ChoiceExercise | BidExercise | PlayExercise;

export interface Page {
  readonly title: string;
  // Paragraphs separated by an empty line
  readonly text: string;
  readonly hand?: string;
}

export interface Lesson {
  readonly number: number;
  readonly title: string;
  readonly goal: string;
  readonly pages: readonly Page[];
  readonly exercises: readonly Exercise[];
}

type Fields = Record<string, unknown>;

function fields(value: unknown, where: string): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where}: expected an object`);
  }
  return value as Fields;
}

function text(source: Fields, key: string, where: string): string {
  const value = source[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${where}: "${key}" must be a non-empty text`);
  }
  return value;
}

function optionalText(source: Fields, key: string, where: string): string | undefined {
  return source[key] === undefined ? undefined : text(source, key, where);
}

function whole(source: Fields, key: string, where: string): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${where}: "${key}" must be a whole number`);
  }
  return value;
}

function list(source: Fields, key: string, where: string): unknown[] {
  const value = source[key];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${where}: "${key}" must be a non-empty list`);
  }
  return value;
}

function oneOf<T extends string>(source: Fields, key: string, allowed: readonly T[], where: string): T {
  const value = text(source, key, where);
  if (!allowed.includes(value as T)) {
    throw new Error(`${where}: "${key}" must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function parseExercise(value: unknown, where: string): Exercise {
  const source = fields(value, where);
  const id = text(source, 'id', where);
  const here = `${where} (${id})`;
  const type = oneOf(source, 'type', ['choice', 'bid', 'play'] as const, here);
  if (type === 'choice') {
    const options = list(source, 'options', here).map((option) => {
      if (typeof option !== 'string') throw new Error(`${here}: every option must be a text`);
      return option;
    });
    const answer = whole(source, 'answer', here);
    if (answer < 0 || answer >= options.length) {
      throw new Error(`${here}: "answer" must point at one of the options`);
    }
    return {
      type,
      id,
      question: text(source, 'question', here),
      hand: optionalText(source, 'hand', here),
      options,
      answer,
      explanation: text(source, 'explanation', here),
    };
  }
  if (type === 'bid') {
    const auction = source.auction;
    if (typeof auction !== 'string') throw new Error(`${here}: "auction" must be a text`);
    return {
      type,
      id,
      hand: text(source, 'hand', here),
      dealer: oneOf(source, 'dealer', SEATS, here),
      auction,
    };
  }
  const hands = fields(source.hands, `${here} hands`);
  return {
    type,
    id,
    intro: text(source, 'intro', here),
    trump: oneOf(source, 'trump', STRAINS, here),
    leader: oneOf(source, 'leader', SEATS, here),
    hands: {
      N: text(hands, 'N', here),
      E: text(hands, 'E', here),
      S: text(hands, 'S', here),
      W: text(hands, 'W', here),
    },
    target: whole(source, 'target', here),
    explanation: text(source, 'explanation', here),
  };
}

// Checks the shape of a lesson file and gives it its types
export function parseLesson(data: unknown): Lesson {
  const source = fields(data, 'lesson');
  const number = whole(source, 'number', 'lesson');
  const where = `lesson ${number}`;
  return {
    number,
    title: text(source, 'title', where),
    goal: text(source, 'goal', where),
    pages: list(source, 'pages', where).map((page, index) => {
      const here = `${where} page ${index + 1}`;
      const pageFields = fields(page, here);
      return {
        title: text(pageFields, 'title', here),
        text: text(pageFields, 'text', here),
        hand: optionalText(pageFields, 'hand', here),
      };
    }),
    exercises: list(source, 'exercises', where).map((exercise, index) =>
      parseExercise(exercise, `${where} exercise ${index + 1}`),
    ),
  };
}
