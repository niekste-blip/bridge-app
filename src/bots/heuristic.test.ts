import { describe, expect, it } from 'vitest';
import { cardId } from '../core';
import { heuristicCard, heuristicChoice } from './heuristic';
import { hands, play, position, viewAt } from './testing';

const card = (...args: Parameters<typeof viewAt>) => cardId(heuristicCard(viewAt(...args)));
const rule = (...args: Parameters<typeof viewAt>) => heuristicChoice(viewAt(...args)).rule;

describe('following suit', () => {
  // South is declarer in no trump, West leads
  const deal = hands('S2 SJ H7', 'SK S9 H8', 'SA S4 H9', 'S3 H5 H6');
  const start = position(deal, 'NT', 'S', 'W');

  it('plays low in second hand', () => {
    expect(card(play(start, 'S3'))).toBe('S2');
  });

  it('names the rule of thumb it followed', () => {
    expect(rule(play(start, 'S3'))).toBe('second-hand-low');
    expect(rule(play(start, 'S3', 'S2'))).toBe('third-hand-high');
    expect(rule(play(start, 'S3', 'S2', 'SK'))).toBe('win-cheaply');
    expect(rule(play(start, 'S3', 'SJ', 'S9'))).toBe('play-low');
  });

  it('covers an honour in second hand', () => {
    const led = position(hands('SA S9 S4', 'S8 H8 H9', 'S2 H2 H3', 'SK H5 H6'), 'NT', 'S', 'W');
    expect(card(play(led, 'SK'))).toBe('SA');
    expect(rule(play(led, 'SK'))).toBe('cover-honour');
  });

  it('plays high in third hand', () => {
    expect(card(play(start, 'S3', 'S2'))).toBe('SK');
  });

  it('wins as cheaply as possible in fourth hand', () => {
    expect(card(play(start, 'S3', 'S2', 'SK'))).toBe('SA');
    expect(card(play(start, 'S3', 'SJ', 'S9'))).toBe('S4'); // partner's jack is winning
  });

  it('plays low when it cannot win the trick', () => {
    expect(card(play(start, 'S3', 'SJ', 'SK', 'SA', 'S4', 'H5'))).toBe('S2');
  });

  it('plays low when partner is winning the trick with an honour', () => {
    const partner = position(hands('S2 S5 H7', 'SK S9 H8', 'SQ S4 H9', 'SA H5 H6'), 'NT', 'S', 'W');
    expect(card(play(partner, 'SA', 'S2'))).toBe('S9');
  });
});

describe('unable to follow suit', () => {
  // Hearts are trumps; East has no spades
  const deal = hands('S2 SJ D7', 'H8 D4 D5', 'SA S4 D9', 'S3 SQ D6');
  const start = position(deal, 'H', 'S', 'W');

  it('ruffs when an opponent is winning', () => {
    expect(card(play(start, 'S3', 'SJ'))).toBe('H8');
    expect(rule(play(start, 'S3', 'SJ'))).toBe('ruff');
    expect(rule(play(start, 'SQ', 'S2'))).toBe('discard');
  });

  it('discards a low side card when partner is winning', () => {
    expect(card(play(start, 'SQ', 'S2'))).toBe('D4');
  });

  it('discards when it has no trumps', () => {
    const noTrumps = position(hands('S2 SJ D7', 'C8 D4 D5', 'SA S4 D9', 'S3 SQ D6'), 'H', 'S', 'W');
    expect(card(play(noTrumps, 'S3', 'SJ'))).toBe('D4');
  });
});

describe('leading', () => {
  it('draws trumps as declarer', () => {
    const state = position(hands('S6 H4 H9', 'SK D2 D3', 'SA S5 H3', 'SQ D4 D5'), 'S', 'S', 'S');
    expect(card(state)).toBe('SA');
    expect(rule(state)).toBe('draw-trumps');
  });

  it('cashes a winner once the trumps are gone', () => {
    const state = position(hands('S6 H4 D9', 'H8 D2 D3', 'S5 HA H3', 'HQ D4 D5'), 'S', 'S', 'S');
    expect(card(state)).toBe('HA');
    expect(rule(state)).toBe('cash-winner');
  });

  it('leads the top of touching honours as a defender', () => {
    const state = position(hands('S6 S4 D9 C2', 'S8 D2 D3 C3', 'SA S5 HA C4', 'HK HQ H4 D5'), 'NT', 'S', 'W');
    expect(card(state)).toBe('HK');
    expect(rule(state)).toBe('long-suit');
  });

  it('leads fourth best from a long suit without a sequence', () => {
    const state = position(hands('S6 S4 D9 C2', 'S8 D2 D3 C3', 'SA S5 HA C4', 'HK H9 H7 H3'), 'NT', 'S', 'W');
    expect(card(state)).toBe('H3');
  });

  it('does not cash an ace that dummy can ruff', () => {
    const state = position(hands('S6 S4 D9', 'S8 D2 D3', 'SA S5 C4', 'HA H7 D5'), 'S', 'S', 'W');
    expect(rule(state)).not.toBe('cash-winner');
  });

  it('does not treat a card as a winner when dummy can beat it', () => {
    const state = position(hands('HA S4 D9', 'S8 D2 D3', 'S6 S5 C4', 'HK H7 D5'), 'NT', 'S', 'W');
    expect(card(state)).toBe('H7');
  });
});
