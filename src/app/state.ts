import { type Call, type Card } from '../core';
import {
  type BotAnswer,
  FRESH,
  type Game,
  type Saved,
  type Settings,
  applyAnswer,
  effectiveProgress,
  newDeclarerGame,
  newGame,
  undoMove,
  userCall,
  userCard,
} from '../game';
import {
  LESSONS,
  type Session,
  afterLesson,
  afterPractice,
  answered,
  currentExercise,
  highestCompleted,
  isOpen,
  lessonByNumber,
  lessonSession,
  nextPage,
  practiceSession,
  previousPage,
  stageOf,
} from '../lessons';

export type Screen = 'home' | 'table' | 'settings' | 'lessons' | 'lesson';

export interface AppState {
  readonly saved: Saved;
  readonly screen: Screen;
  // A message shown once on the home screen, or null
  readonly notice: string | null;
  // The lesson or practice round in progress; it is not saved
  readonly session: Session | null;
}

export type Action =
  | { readonly type: 'go'; readonly screen: Screen }
  | { readonly type: 'newBoard'; readonly seed: number }
  | { readonly type: 'replay' }
  | { readonly type: 'call'; readonly call: Call }
  | { readonly type: 'card'; readonly card: Card }
  | { readonly type: 'bot'; readonly answer: BotAnswer; readonly forGame: Game }
  | { readonly type: 'undo' }
  | { readonly type: 'settings'; readonly settings: Settings }
  | { readonly type: 'reset' }
  | { readonly type: 'dismissNotice' }
  | { readonly type: 'openLesson'; readonly number: number }
  | { readonly type: 'practice' }
  | { readonly type: 'lessonNext' }
  | { readonly type: 'lessonBack' }
  | { readonly type: 'lessonAnswer'; readonly right: boolean }
  | { readonly type: 'lessonClose' };

export const RECOVERED_NOTICE =
  'De opgeslagen gegevens konden niet worden gelezen. Het lopende spel is gewist.';
// Bidding is taught in lesson 4; before that the bots bid and the user only plays
const FIRST_BIDDING_LESSON = 4;

export function initialState(saved: Saved, recovered: boolean): AppState {
  return { saved, screen: 'home', notice: recovered ? RECOVERED_NOTICE : null, session: null };
}

// Whether the user bids in free play: the setting, and only once bidding has been taught
export function userBidsNow(settings: Settings): boolean {
  return settings.userBids && effectiveProgress(settings) >= FIRST_BIDDING_LESSON;
}

function deal(board: number, seed: number, settings: Settings): Game {
  return userBidsNow(settings) ? newGame(board, seed) : newDeclarerGame(board, seed, settings);
}

function withGame(state: AppState, game: Game | null): AppState {
  return { ...state, saved: { ...state.saved, game } };
}

function answerExercise(state: AppState, right: boolean): AppState {
  const { session, saved } = state;
  const exercise = session && currentExercise(session);
  if (!session || !exercise) return state;
  const next = answered(session, right);
  let progress = saved.progress;
  if (session.lessonNumber === null) {
    // Practice: every answer counts at once
    progress = afterPractice(progress, exercise.id, right);
  } else if (stageOf(next) === 'done') {
    progress = afterLesson(progress, session.lessonNumber, next.firstTries);
  }
  const settings = { ...saved.settings, progressLesson: highestCompleted(progress) };
  return { ...state, session: next, saved: { ...saved, progress, settings } };
}

export function reduce(state: AppState, action: Action): AppState {
  const { saved } = state;
  const { game } = saved;
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen };
    case 'newBoard':
      return {
        ...state,
        screen: 'table',
        saved: {
          ...saved,
          game: deal(saved.nextBoard, action.seed, saved.settings),
          nextBoard: saved.nextBoard + 1,
        },
      };
    case 'replay':
      return game ? withGame(state, deal(game.board, game.seed, saved.settings)) : state;
    case 'call':
      return game ? withGame(state, userCall(game, action.call)) : state;
    case 'card':
      return game ? withGame(state, userCard(game, action.card)) : state;
    case 'bot':
      // An answer for an older position, for example after taking back a move, is dropped
      return game && game === action.forGame ? withGame(state, applyAnswer(game, action.answer)) : state;
    case 'undo':
      return game ? withGame(state, undoMove(game)) : state;
    case 'settings':
      return { ...state, saved: { ...saved, settings: action.settings } };
    case 'reset':
      return { saved: FRESH, screen: 'home', notice: null, session: null };
    case 'dismissNotice':
      return { ...state, notice: null };
    case 'openLesson': {
      const lesson = lessonByNumber(action.number);
      if (!lesson || !isOpen(saved.progress, lesson.number, saved.settings.unlockAll)) return state;
      return { ...state, screen: 'lesson', session: lessonSession(lesson) };
    }
    case 'practice': {
      const ids = saved.progress.trouble.map((item) => item.id);
      return ids.length === 0
        ? state
        : { ...state, screen: 'lesson', session: practiceSession(LESSONS, ids) };
    }
    case 'lessonNext':
      return state.session ? { ...state, session: nextPage(state.session) } : state;
    case 'lessonBack':
      return state.session ? { ...state, session: previousPage(state.session) } : state;
    case 'lessonAnswer':
      return answerExercise(state, action.right);
    case 'lessonClose':
      return { ...state, screen: 'lessons', session: null };
  }
}
