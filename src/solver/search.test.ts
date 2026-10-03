import { describe, expect, it } from 'vitest';
import { NO_TRUMP, Search } from './search';

const SEAT = { N: 0, E: 1, S: 2, W: 3 } as const;
const SUIT = { C: 0, D: 1, H: 2, S: 3 } as const;
const RANKS = '23456789TJQKA';

// Puts cards such as 'SA' or 'H2' in the hand of a seat
function give(search: Search, seat: keyof typeof SEAT, ...cards: string[]): void {
  for (const card of cards) {
    const suit = SUIT[card[0] as keyof typeof SUIT];
    search.hands[SEAT[seat] * 4 + suit] |= 1 << RANKS.indexOf(card[1]);
  }
}

function twoCardEnding(trump: number): Search {
  const search = new Search(trump);
  give(search, 'N', 'SA', 'SK');
  give(search, 'E', 'S2', 'S3');
  give(search, 'S', 'H2', 'H3');
  give(search, 'W', 'S4', 'C2');
  return search;
}

describe('Search', () => {
  it('counts the tricks for North-South with North on lead', () => {
    expect(twoCardEnding(NO_TRUMP).nsTricks(SEAT.N, 0, 2)).toBe(2);
  });

  it('lets a defender ruff', () => {
    expect(twoCardEnding(SUIT.C).nsTricks(SEAT.N, 0, 2)).toBe(1);
  });

  it('depends on who leads', () => {
    // West leads the club: it wins in no trump, and then the spade is lost to North
    expect(twoCardEnding(NO_TRUMP).nsTricks(SEAT.W, 0, 2)).toBe(1);
  });

  it('leaves the hands as they were', () => {
    const search = twoCardEnding(NO_TRUMP);
    const before = [...search.hands];
    search.nsTricks(SEAT.N, 0, 2);
    expect([...search.hands]).toEqual(before);
  });

  it('answers whether a number of tricks can be made', () => {
    const search = twoCardEnding(NO_TRUMP);
    expect(search.canTake(SEAT.N, 0, 2, 2, 0)).toBe(true);
    expect(search.canTake(SEAT.N, 0, 3, 2, 0)).toBe(false);
    expect(search.canTake(SEAT.N, 0, 0, 2, 0)).toBe(true);
  });

  it('finds the winner of a trick', () => {
    const search = new Search(SUIT.H);
    const trick: [number, number][] = [
      [SUIT.S, 5],
      [SUIT.S, 12],
      [SUIT.H, 0],
      [SUIT.D, 12],
    ];
    trick.forEach(([suit, rank], index) => {
      search.trickSuit[index] = suit;
      search.trickRank[index] = rank;
    });
    expect(search.winnerIndex(0)).toBe(2); // the small trump beats the ace of spades
    expect(new Search(NO_TRUMP).winnerIndex(0)).toBe(0); // an empty trick: the first card stands
  });
});
