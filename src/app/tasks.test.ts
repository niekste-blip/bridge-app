import { describe, expect, it } from 'vitest';
import { fourCardBoard } from '../coach/testing';
import { DEFAULT_SETTINGS, botRequestFor, newGame } from '../game';
import { quickResult, runTask } from './tasks';

const settings = DEFAULT_SETTINGS;

describe('tasks', () => {
  it('answers for a bot', () => {
    const request = botRequestFor(newGame(1, 1), settings);
    if (!request) throw new Error('expected a bot to start');
    const result = runTask({ kind: 'bot', request });
    expect(result).toMatchObject({ kind: 'call' });
    expect(quickResult({ kind: 'bot', request })).toEqual(result);
  });

  it('gives no card hint when the user is not to play', () => {
    expect(runTask({ kind: 'hint', game: newGame(1, 1), settings })).toBeNull();
    expect(quickResult({ kind: 'hint', game: newGame(1, 1), settings })).toBeNull();
  });

  it('reviews a board, and only the bidding when in a hurry', () => {
    const game = fourCardBoard('blunder');
    const full = runTask({ kind: 'review', game, settings });
    const quick = quickResult({ kind: 'review', game, settings });
    expect(Array.isArray(full) && full.map((moment) => moment.kind)).toEqual(['call', 'card']);
    expect(Array.isArray(quick) && quick.map((moment) => moment.kind)).toEqual(['call']);
  });
});
