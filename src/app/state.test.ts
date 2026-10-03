import { describe, expect, it } from 'vitest';
import { PASS, legalCards } from '../core';
import { DEFAULT_SETTINGS, FRESH, answer, botRequestFor, phaseOf, turnOf } from '../game';
import { LESSONS, currentExercise, stageOf } from '../lessons';
import { type AppState, RECOVERED_NOTICE, initialState, reduce, userBidsNow } from './state';

const fresh = initialState(FRESH, false);
// Someone who has finished the bidding lessons, so that the user bids in free play
const bidder = initialState({ ...FRESH, settings: { ...DEFAULT_SETTINGS, unlockAll: true } }, false);

function withBoard(state: AppState = bidder, seed = 11): AppState {
  return reduce(state, { type: 'newBoard', seed });
}

// Lets the bots act until the user is to act or the board is over
function runBots(state: AppState): AppState {
  let current = state;
  for (let step = 0; step < 300; step++) {
    const game = current.saved.game;
    const request = game ? botRequestFor(game, current.saved.settings) : null;
    if (!game || !request) break;
    const fast = request.kind === 'card' ? { ...request, budgetMs: 30 } : request;
    current = reduce(current, { type: 'bot', answer: answer(fast), forGame: game });
  }
  return current;
}

// Reads the pages and answers every exercise; `wrong` exercises are missed once
function followLesson(state: AppState, number: number, wrong: readonly string[] = []): AppState {
  let current = reduce(state, { type: 'openLesson', number });
  const missed = new Set<string>();
  for (let step = 0; step < 200 && current.session; step++) {
    const stage = stageOf(current.session);
    if (stage === 'done') break;
    if (stage === 'pages') {
      current = reduce(current, { type: 'lessonNext' });
      continue;
    }
    const exercise = currentExercise(current.session);
    const right = !exercise || !wrong.includes(exercise.id) || missed.has(exercise.id);
    if (exercise && !right) missed.add(exercise.id);
    current = reduce(current, { type: 'lessonAnswer', right });
  }
  return current;
}

describe('initialState', () => {
  it('opens on the home screen', () => {
    expect(fresh).toEqual({ saved: FRESH, screen: 'home', notice: null, session: null });
  });

  it('tells the user when stored data was lost', () => {
    expect(initialState(FRESH, true).notice).toBe(RECOVERED_NOTICE);
    expect(reduce(initialState(FRESH, true), { type: 'dismissNotice' }).notice).toBeNull();
  });
});

describe('free play', () => {
  it('deals a new board and goes to the table', () => {
    const state = withBoard();
    expect(state.screen).toBe('table');
    expect(state.saved.game?.board).toBe(1);
    expect(state.saved.game?.seed).toBe(11);
    expect(state.saved.nextBoard).toBe(2);
    expect(withBoard(state).saved.game?.board).toBe(2);
  });

  it('lets the bots bid until the user has learned to bid', () => {
    expect(userBidsNow(DEFAULT_SETTINGS)).toBe(false);
    expect(userBidsNow({ ...DEFAULT_SETTINGS, progressLesson: 3 })).toBe(false);
    expect(userBidsNow({ ...DEFAULT_SETTINGS, progressLesson: 4 })).toBe(true);
    expect(userBidsNow({ ...DEFAULT_SETTINGS, unlockAll: true })).toBe(true);
    expect(userBidsNow({ ...DEFAULT_SETTINGS, unlockAll: true, userBids: false })).toBe(false);
    const game = withBoard(fresh).saved.game;
    expect(game?.contract?.declarer).toBe('S');
    expect(game && phaseOf(game)).toBe('play');
  });

  it('applies calls of the user', () => {
    let state = runBots(withBoard());
    expect(state.saved.game && turnOf(state.saved.game)?.byUser).toBe(true);
    state = reduce(state, { type: 'call', call: PASS });
    expect(state.saved.game?.auction.calls.at(-1)).toEqual(PASS);
  });

  it('plays a whole board to the end', () => {
    let state = withBoard(bidder, 3);
    for (let step = 0; step < 120; step++) {
      state = runBots(state);
      const game = state.saved.game;
      if (!game || !turnOf(game)) break;
      state =
        phaseOf(game) === 'auction' || !game.play
          ? reduce(state, { type: 'call', call: PASS })
          : reduce(state, { type: 'card', card: legalCards(game.play)[0] });
    }
    const game = state.saved.game;
    expect(game && ['finished', 'passedOut']).toContain(game && phaseOf(game));
  }, 60000);

  it('drops a bot answer that belongs to an older position', () => {
    const state = withBoard();
    const game = state.saved.game;
    const request = game && botRequestFor(game, state.saved.settings);
    if (!game || !request) throw new Error('expected a bot to start');
    const moved = reduce(state, { type: 'bot', answer: answer(request), forGame: game });
    expect(reduce(moved, { type: 'bot', answer: answer(request), forGame: game })).toBe(moved);
  });

  it('takes back the last move of the user', () => {
    const before = runBots(withBoard());
    const after = runBots(reduce(before, { type: 'call', call: PASS }));
    const afterGame = after.saved.game;
    if (afterGame && phaseOf(afterGame) === 'auction') {
      expect(reduce(after, { type: 'undo' }).saved.game).toEqual(before.saved.game);
    }
  });

  it('replays the same board', () => {
    const played = runBots(withBoard());
    const replayed = reduce(played, { type: 'replay' });
    expect(replayed.saved.game?.deal).toEqual(played.saved.game?.deal);
    expect(replayed.saved.game?.auction.calls).toEqual([]);
    expect(replayed.saved.nextBoard).toBe(played.saved.nextBoard);
  });

  it('ignores game actions without a game', () => {
    expect(reduce(fresh, { type: 'call', call: PASS })).toBe(fresh);
    expect(reduce(fresh, { type: 'undo' })).toBe(fresh);
    expect(reduce(fresh, { type: 'replay' })).toBe(fresh);
  });
});

describe('settings', () => {
  it('changes settings and screens', () => {
    const settings = { ...DEFAULT_SETTINGS, level: 'hard' as const };
    expect(reduce(fresh, { type: 'settings', settings }).saved.settings.level).toBe('hard');
    expect(reduce(fresh, { type: 'go', screen: 'settings' }).screen).toBe('settings');
  });

  it('wipes everything on reset', () => {
    const state = followLesson(withBoard(), 1);
    expect(reduce(state, { type: 'reset' })).toEqual(fresh);
  });
});

describe('lessons', () => {
  it('opens the first lesson but not a later one', () => {
    const opened = reduce(fresh, { type: 'openLesson', number: 1 });
    expect(opened.screen).toBe('lesson');
    expect(opened.session?.lessonNumber).toBe(1);
    expect(reduce(fresh, { type: 'openLesson', number: 2 })).toBe(fresh);
    expect(reduce(fresh, { type: 'openLesson', number: 99 })).toBe(fresh);
    expect(reduce(bidder, { type: 'openLesson', number: 5 }).session?.lessonNumber).toBe(5);
  });

  it('pages back and forth', () => {
    const second = reduce(reduce(fresh, { type: 'openLesson', number: 1 }), { type: 'lessonNext' });
    expect(second.session?.page).toBe(1);
    expect(reduce(second, { type: 'lessonBack' }).session?.page).toBe(0);
  });

  it('finishes a lesson, opens the next one and raises the progress of the bots', () => {
    const done = followLesson(fresh, 1);
    expect(done.session && stageOf(done.session)).toBe('done');
    expect(done.saved.progress).toEqual({ completed: [1], trouble: [] });
    expect(done.saved.settings.progressLesson).toBe(1);
    const closed = reduce(done, { type: 'lessonClose' });
    expect(closed.screen).toBe('lessons');
    expect(closed.session).toBeNull();
    expect(reduce(closed, { type: 'openLesson', number: 2 }).session?.lessonNumber).toBe(2);
  });

  it('remembers what went wrong, and does not finish a lesson with too many mistakes', () => {
    const ids = LESSONS[0].exercises.map((exercise) => exercise.id);
    const oneWrong = followLesson(fresh, 1, [ids[0]]);
    expect(oneWrong.saved.progress).toEqual({ completed: [1], trouble: [{ id: ids[0], streak: 0 }] });
    const manyWrong = followLesson(fresh, 1, ids.slice(0, 3));
    expect(manyWrong.saved.progress.completed).toEqual([]);
    expect(manyWrong.saved.progress.trouble).toHaveLength(3);
  });

  it('practises the remembered exercises until they are right twice in a row', () => {
    const id = LESSONS[0].exercises[0].id;
    let state = reduce(followLesson(fresh, 1, [id]), { type: 'lessonClose' });
    state = reduce(state, { type: 'practice' });
    expect(state.session?.lessonNumber).toBeNull();
    expect(state.session?.queue.map((exercise) => exercise.id)).toEqual([id]);
    state = reduce(state, { type: 'lessonAnswer', right: true });
    expect(state.saved.progress.trouble).toEqual([{ id, streak: 1 }]);
    state = reduce(reduce(state, { type: 'lessonClose' }), { type: 'practice' });
    state = reduce(state, { type: 'lessonAnswer', right: true });
    expect(state.saved.progress.trouble).toEqual([]);
    expect(reduce(reduce(state, { type: 'lessonClose' }), { type: 'practice' }).session).toBeNull();
  });

  it('ignores lesson actions without a session', () => {
    expect(reduce(fresh, { type: 'lessonNext' })).toBe(fresh);
    expect(reduce(fresh, { type: 'lessonAnswer', right: true })).toBe(fresh);
    expect(reduce(fresh, { type: 'practice' })).toBe(fresh);
  });
});
