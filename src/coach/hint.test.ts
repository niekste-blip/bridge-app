import { describe, expect, it } from 'vitest';
import { PASS, bid, callText, cardId, parseCard } from '../core';
import { chooseCall } from '../bidding';
import { hands, play, position, viewAt } from '../bots/testing';
import { DEFAULT_SETTINGS, type Game, botCallIn, newGame, turnOf, userCall } from '../game';
import {
  NO_AGREEMENT,
  adviceLesson,
  callHint,
  callMeaning,
  cardHint,
  cardHintFor,
  cardName,
  lessonFor,
  tricksText,
} from './hint';
import { fourCardBoard } from './testing';

const pass = { call: PASS, ruleId: 'test', explanation: 'Pas: test.', source: 'rule' as const };
const options = { seed: 1, maxLesson: 7 };

// Board 1 with two passes by the bots, so that South is to call
function southToCall(seed: number): Game {
  return botCallIn(botCallIn(newGame(1, seed), pass), pass);
}

describe('small helpers', () => {
  it('names a card with Dutch honour letters', () => {
    expect(cardName(parseCard('SK'))).toBe('♠H');
    expect(cardName(parseCard('DT'))).toBe('♦10');
  });

  it('writes tricks with a decimal comma', () => {
    expect(tricksText(1.25)).toBe('1,3');
    expect(tricksText(2)).toBe('2,0');
  });

  it('never advises below lesson 7', () => {
    expect(lessonFor({ ...DEFAULT_SETTINGS, progressLesson: 4 })).toBe(7);
    expect(lessonFor({ ...DEFAULT_SETTINGS, progressLesson: 11 })).toBe(11);
    expect(lessonFor({ ...DEFAULT_SETTINGS, unlockAll: true })).toBe(13);
  });
});

describe('adviceLesson', () => {
  it('follows the progress of the user, with lesson 4 as the least', () => {
    expect(adviceLesson({ ...DEFAULT_SETTINGS, progressLesson: 0 })).toBe(4);
    expect(adviceLesson({ ...DEFAULT_SETTINGS, progressLesson: 5 })).toBe(5);
    expect(adviceLesson({ ...DEFAULT_SETTINGS, progressLesson: 11 })).toBe(11);
  });
});

describe('callHint', () => {
  it('gives the call the rules prescribe for the hand of the user', () => {
    const game = southToCall(1);
    const hint = callHint(game, DEFAULT_SETTINGS);
    expect(hint).toEqual(chooseCall(game.deal.S, game.auction, { maxLesson: 7 }));
    expect(hint?.explanation).toMatch(/: /);
  });

  it('gives nothing when it is not the turn of the user', () => {
    expect(callHint(newGame(1, 1), DEFAULT_SETTINGS)).toBeNull();
  });
});

describe('cardHintFor', () => {
  it('says so when only one card may be played', () => {
    const forced = viewAt(play(position(hands('S5 H3', 'SK D2', 'SA S2', 'SQ D3'), 'NT', 'S', 'S'), 'SA', 'SQ'));
    expect(cardHintFor(forced, options)).toEqual({
      card: parseCard('S5'),
      text: 'Dit is de enige kaart die u mag spelen.',
    });
  });

  it('finds the best card by simulation and gives the averages', () => {
    const lead = viewAt(position(hands('H2 H3', 'SK D2', 'SA S2', 'SQ D3'), 'NT', 'S', 'S'));
    const hint = cardHintFor(lead, options);
    expect(cardId(hint.card)).toBe('SA');
    expect(hint.text).toMatch(
      /^Deze kaart levert in de rest van het spel gemiddeld de meeste slagen op: \d,\d\. De beste andere kaart haalt \d,\d\.$/,
    );
  });

  it('explains the rule of thumb when it does not simulate', () => {
    const second = viewAt(play(position(hands('S2 SJ H7', 'SK S9 H8', 'SA S4 H9', 'S3 H5 H6'), 'NT', 'S', 'W'), 'S3'));
    const hint = cardHintFor(second, { ...options, samples: 0 });
    expect(cardId(hint.card)).toBe('S2');
    expect(hint.text).toBe('Tweede hand laag: bewaar uw hoge kaarten.');
  });

  it('says so when every card is equally good', () => {
    const equal = viewAt(position(hands('H2 H3', 'D4 D2', 'S3 S2', 'D5 D3'), 'NT', 'S', 'S'));
    expect(cardHintFor(equal, options).text).toMatch(/^Alle kaarten leveren hier evenveel slagen op\./);
  });
});

describe('cardHint', () => {
  it('advises the user during the play and nobody else', () => {
    const finished = fourCardBoard('cash');
    expect(cardHint(finished, DEFAULT_SETTINGS)).toBeNull();
    expect(cardHint(newGame(1, 1), DEFAULT_SETTINGS)).toBeNull();
  });
});

describe('callMeaning', () => {
  it('gives the explanation of a bot call', () => {
    expect(callMeaning(southToCall(1), 0, DEFAULT_SETTINGS)).toBe('Pas: test.');
  });

  it('looks up the meaning of a call by the user', () => {
    const game = userCall(southToCall(1), bid(1, 'H'));
    expect(turnOf(game)?.seat).toBe('W');
    expect(callText(game.auction.calls[2])).toBe('1H');
    expect(callMeaning(game, 2, DEFAULT_SETTINGS)).toBe('1♥: vanaf 12 punten en minstens 5 harten.');
  });

  it('says so when the rules give the call no meaning', () => {
    const game = userCall(southToCall(1), bid(4, 'C'));
    expect(callMeaning(game, 2, DEFAULT_SETTINGS)).toBe(NO_AGREEMENT);
  });
});
