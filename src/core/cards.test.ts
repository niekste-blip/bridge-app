import { describe, expect, it } from 'vitest';
import { cardId, fullDeck, parseCard, rankLabel, sameCard } from './cards';

describe('parseCard', () => {
  it('reads suit and rank', () => {
    expect(parseCard('SA')).toEqual({ suit: 'S', rank: 14 });
    expect(parseCard('HT')).toEqual({ suit: 'H', rank: 10 });
    expect(parseCard('D2')).toEqual({ suit: 'D', rank: 2 });
  });

  it('rejects invalid text', () => {
    expect(() => parseCard('X2')).toThrow();
    expect(() => parseCard('S1')).toThrow();
    expect(() => parseCard('SAA')).toThrow();
    expect(() => parseCard('S')).toThrow();
  });
});

describe('fullDeck', () => {
  it('has 52 different cards', () => {
    const ids = fullDeck().map(cardId);
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
  });

  it('round-trips through cardId and parseCard', () => {
    for (const card of fullDeck()) {
      expect(parseCard(cardId(card))).toEqual(card);
    }
  });
});

describe('sameCard', () => {
  it('compares suit and rank', () => {
    expect(sameCard(parseCard('SA'), parseCard('SA'))).toBe(true);
    expect(sameCard(parseCard('SA'), parseCard('HA'))).toBe(false);
    expect(sameCard(parseCard('SA'), parseCard('SK'))).toBe(false);
  });
});

describe('rankLabel', () => {
  it('uses Dutch letters for honours', () => {
    expect(rankLabel(14)).toBe('A');
    expect(rankLabel(13)).toBe('H');
    expect(rankLabel(12)).toBe('V');
    expect(rankLabel(11)).toBe('B');
    expect(rankLabel(10)).toBe('10');
    expect(rankLabel(2)).toBe('2');
  });
});
