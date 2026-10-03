import { describe, expect, it } from 'vitest';
import { PASS, legalCards } from '../core';
import { DEFAULT_SETTINGS, FRESH, answer, botRequestFor, phaseOf, turnOf } from '../game';
import { type AppState, RECOVERED_NOTICE, initialState, reduce } from './state';

const fresh = initialState(FRESH, false);

function withBoard(state: AppState = fresh, seed = 11): AppState {
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

describe('initialState', () => {
  it('opens on the home screen', () => {
    expect(fresh).toEqual({ saved: FRESH, screen: 'home', notice: null });
  });

  it('tells the user when stored data was lost', () => {
    expect(initialState(FRESH, true).notice).toBe(RECOVERED_NOTICE);
    expect(reduce(initialState(FRESH, true), { type: 'dismissNotice' }).notice).toBeNull();
  });
});

describe('reduce', () => {
  it('deals a new board and goes to the table', () => {
    const state = withBoard();
    expect(state.screen).toBe('table');
    expect(state.saved.game?.board).toBe(1);
    expect(state.saved.game?.seed).toBe(11);
    expect(state.saved.nextBoard).toBe(2);
    expect(withBoard(state).saved.game?.board).toBe(2);
  });

  it('deals a board on which the user is declarer when the user does not bid', () => {
    const settings = { ...DEFAULT_SETTINGS, userBids: false };
    const state = withBoard(reduce(fresh, { type: 'settings', settings }));
    const game = state.saved.game;
    expect(game?.contract?.declarer).toBe('S');
    expect(game && phaseOf(game)).toBe('play');
  });

  it('applies calls and cards of the user', () => {
    let state = runBots(withBoard());
    expect(state.saved.game && turnOf(state.saved.game)?.byUser).toBe(true);
    state = reduce(state, { type: 'call', call: PASS });
    expect(state.saved.game?.auction.calls.at(-1)).toEqual(PASS);
  });

  it('plays a whole board to the end', () => {
    let state = withBoard(fresh, 3);
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

  it('changes settings and screens', () => {
    const settings = { ...DEFAULT_SETTINGS, level: 'hard' as const };
    expect(reduce(fresh, { type: 'settings', settings }).saved.settings.level).toBe('hard');
    expect(reduce(fresh, { type: 'go', screen: 'settings' }).screen).toBe('settings');
  });

  it('wipes everything on reset', () => {
    const state = reduce(withBoard(), { type: 'settings', settings: { ...DEFAULT_SETTINGS, level: 'hard' } });
    expect(reduce(state, { type: 'reset' })).toEqual(fresh);
  });

  it('ignores game actions without a game', () => {
    expect(reduce(fresh, { type: 'call', call: PASS })).toBe(fresh);
    expect(reduce(fresh, { type: 'undo' })).toBe(fresh);
    expect(reduce(fresh, { type: 'replay' })).toBe(fresh);
  });
});
