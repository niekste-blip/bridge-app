import { describe, expect, it } from 'vitest';
import { PASS, bid, legalCards, sameCard } from '../core';
import {
  answer,
  applyAnswer,
  bidOutByBots,
  botRequestFor,
  levelFor,
  newDeclarerGame,
  quickAnswer,
} from './botTurn';
import { type Game, newGame, phaseOf, turnOf, userCall, userCard } from './game';
import { DEFAULT_SETTINGS, type Settings } from './settings';

const settings: Settings = { ...DEFAULT_SETTINGS, level: 'medium', progressLesson: 9 };

// Plays a whole board: the bots answer, the user passes and plays the first legal card
function playBoard(start: Game): Game {
  let game = start;
  for (let step = 0; step < 400 && turnOf(game); step++) {
    const request = botRequestFor(game, settings);
    if (request) {
      game = applyAnswer(game, answer({ ...request, ...(request.kind === 'card' ? { budgetMs: 50 } : {}) }));
    } else if (phaseOf(game) === 'auction') {
      game = userCall(game, PASS);
    } else if (game.play) {
      game = userCard(game, legalCards(game.play)[0]);
    }
  }
  return game;
}

describe('levelFor', () => {
  it('gives the partner the hard level and the opponents the chosen level', () => {
    expect(levelFor('N', settings)).toBe('hard');
    expect(levelFor('S', settings)).toBe('hard');
    expect(levelFor('E', settings)).toBe('medium');
    expect(levelFor('W', settings)).toBe('medium');
  });
});

describe('botRequestFor', () => {
  it('asks a bot for a call with its own hand only', () => {
    const game = newGame(1, 1);
    const request = botRequestFor(game, settings);
    expect(request).toEqual({
      kind: 'call',
      hand: game.deal.N,
      auction: game.auction,
      level: 'hard',
      progressLesson: 9,
    });
    const unlocked = botRequestFor(game, { ...settings, unlockAll: true });
    expect(unlocked?.progressLesson).toBe(13);
  });

  it('asks nothing when the user is to act', () => {
    let game = newGame(1, 1);
    while (!turnOf(game)?.byUser) {
      const request = botRequestFor(game, settings);
      if (!request) throw new Error('expected a request');
      game = applyAnswer(game, answer(request));
    }
    expect(botRequestFor(game, settings)).toBeNull();
  });

  it('asks a bot for a card through a view without the hidden hands', () => {
    const game = bidOutByBots(newGame(1, 3), settings);
    if (phaseOf(game) !== 'play') throw new Error('expected a contract on this seed');
    const request = botRequestFor(game, settings);
    const turn = turnOf(game);
    if (turn?.byUser) {
      expect(request).toBeNull();
    } else {
      expect(request?.kind).toBe('card');
      if (request?.kind === 'card') {
        expect(Object.keys(request.view.hands)).toEqual([turn?.seat]);
        expect(request.budgetMs).toBe(1500);
      }
    }
  });
});

describe('answer and quickAnswer', () => {
  it('give a legal card', () => {
    let game = bidOutByBots(newGame(1, 3), settings);
    for (let i = 0; i < 20 && game.play; i++) {
      const request = botRequestFor(game, settings);
      if (!request) {
        game = userCard(game, legalCards(game.play)[0]);
        continue;
      }
      const legal = legalCards(game.play);
      const full = answer({ ...request, ...(request.kind === 'card' ? { budgetMs: 50 } : {}) });
      const quick = quickAnswer(request);
      for (const given of [full, quick]) {
        expect(given.kind).toBe('card');
        if (given.kind === 'card') {
          expect(legal.some((card) => sameCard(card, given.card))).toBe(true);
        }
      }
      game = applyAnswer(game, full);
    }
  });

  it('give the same call either way', () => {
    const request = botRequestFor(newGame(1, 1), settings);
    if (!request) throw new Error('expected a request');
    expect(quickAnswer(request)).toEqual(answer(request));
  });
});

describe('whole boards', () => {
  it('run to the end with bots and a user', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const game = playBoard(newGame(seed, seed));
      expect(['finished', 'passedOut']).toContain(phaseOf(game));
    }
  }, 60000);

  it('can be bid by the bots alone', () => {
    const game = bidOutByBots(newGame(1, 3), settings);
    expect(phaseOf(game)).not.toBe('auction');
    expect(game.notes.every((text) => typeof text === 'string')).toBe(true);
  });

  it('can be dealt so that the user is declarer', () => {
    const game = newDeclarerGame(1, 1, settings);
    expect(game.contract?.declarer).toBe('S');
    expect(phaseOf(game)).toBe('play');
    const again = newDeclarerGame(1, 1, settings);
    expect(again.seed).toBe(game.seed);
  });

  it('accept a bid from the user', () => {
    let game = newGame(3, 1); // South deals
    expect(turnOf(game)?.byUser).toBe(true);
    game = userCall(game, bid(1, 'NT'));
    const request = botRequestFor(game, settings);
    expect(request?.kind).toBe('call');
  });
});
