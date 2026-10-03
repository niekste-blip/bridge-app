import { describe, expect, it } from 'vitest';
import { cardId } from './cards';
import { dealCards, highCardPoints, parseHand, seededRng, sortHand, suitLength } from './deal';
import { SEATS } from './seats';

describe('parseHand', () => {
  it('reads spades.hearts.diamonds.clubs', () => {
    const hand = parseHand('AKQ.JT9.876.5432');
    expect(hand).toHaveLength(13);
    expect(hand.map(cardId)).toEqual([
      'SA', 'SK', 'SQ', 'HJ', 'HT', 'H9', 'D8', 'D7', 'D6', 'C5', 'C4', 'C3', 'C2',
    ]);
  });

  it('accepts a void suit', () => {
    const hand = parseHand('AKQJT98765432...');
    expect(hand).toHaveLength(13);
    expect(suitLength(hand, 'S')).toBe(13);
    expect(suitLength(hand, 'H')).toBe(0);
  });

  it('rejects text without four suits', () => {
    expect(() => parseHand('AKQ.JT9.876')).toThrow();
  });
});

describe('highCardPoints', () => {
  it('counts ace 4, king 3, queen 2, jack 1', () => {
    expect(highCardPoints(parseHand('AKQ.JT9.876.5432'))).toBe(10);
    expect(highCardPoints(parseHand('AKQJ.AKQ.AKQ.AKQ'))).toBe(37);
    expect(highCardPoints(parseHand('T98.765.432.9876'))).toBe(0);
  });
});

describe('suitLength', () => {
  it('counts the cards in one suit', () => {
    const hand = parseHand('AKQ.JT9.876.5432');
    expect(suitLength(hand, 'S')).toBe(3);
    expect(suitLength(hand, 'C')).toBe(4);
  });
});

describe('dealCards', () => {
  it('gives every seat 13 cards and uses the whole deck', () => {
    const deal = dealCards(seededRng(1));
    const ids = SEATS.flatMap((seat) => deal[seat].map(cardId));
    for (const seat of SEATS) expect(deal[seat]).toHaveLength(13);
    expect(new Set(ids).size).toBe(52);
  });

  it('deals 40 high card points in total', () => {
    const deal = dealCards(seededRng(7));
    const total = SEATS.reduce((sum, seat) => sum + highCardPoints(deal[seat]), 0);
    expect(total).toBe(40);
  });

  it('gives the same deal for the same seed', () => {
    expect(dealCards(seededRng(123))).toEqual(dealCards(seededRng(123)));
  });

  it('gives different deals for different seeds', () => {
    expect(dealCards(seededRng(1))).not.toEqual(dealCards(seededRng(2)));
  });

  it('returns sorted hands', () => {
    const deal = dealCards(seededRng(5));
    for (const seat of SEATS) expect(deal[seat]).toEqual(sortHand(deal[seat]));
  });
});

describe('sortHand', () => {
  it('orders spades, hearts, diamonds, clubs and high to low', () => {
    const shuffled = [...parseHand('A2.K3.Q4.J5')].reverse();
    expect(sortHand(shuffled).map(cardId)).toEqual(['SA', 'S2', 'HK', 'H3', 'DQ', 'D4', 'CJ', 'C5']);
  });
});
