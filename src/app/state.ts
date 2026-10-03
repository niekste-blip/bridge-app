import { type Call, type Card } from '../core';
import {
  type BotAnswer,
  FRESH,
  type Game,
  type Saved,
  type Settings,
  applyAnswer,
  newDeclarerGame,
  newGame,
  undoMove,
  userCall,
  userCard,
} from '../game';

export type Screen = 'home' | 'table' | 'settings';

export interface AppState {
  readonly saved: Saved;
  readonly screen: Screen;
  // A message shown once on the home screen, or null
  readonly notice: string | null;
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
  | { readonly type: 'dismissNotice' };

export const RECOVERED_NOTICE =
  'De opgeslagen gegevens konden niet worden gelezen. Het lopende spel is gewist.';

export function initialState(saved: Saved, recovered: boolean): AppState {
  return { saved, screen: 'home', notice: recovered ? RECOVERED_NOTICE : null };
}

function deal(board: number, seed: number, settings: Settings): Game {
  return settings.userBids ? newGame(board, seed) : newDeclarerGame(board, seed, settings);
}

function withGame(state: AppState, game: Game | null): AppState {
  return { ...state, saved: { ...state.saved, game } };
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
      return { saved: FRESH, screen: 'home', notice: null };
    case 'dismissNotice':
      return { ...state, notice: null };
  }
}
