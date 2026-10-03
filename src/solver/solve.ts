import { type Card, type PlayState, SEATS, SUITS, legalCards, seatToPlay } from '../core';
import { NO_TRUMP, Search } from './search';

export interface CardResult {
  readonly card: Card;
  // Tricks the side of the player to move takes from the unfinished tricks
  // when this card is played and both sides play perfectly with open cards
  readonly tricks: number;
}

// One search per trump: its table holds positions by relative rank, so it stays valid across deals
const searches = new Map<number, Search>();

function searchFor(trump: number): Search {
  let search = searches.get(trump);
  if (!search) {
    search = new Search(trump);
    searches.set(trump, search);
  }
  return search;
}

export function solve(state: PlayState): CardResult[] {
  const trump = state.trump === 'NT' ? NO_TRUMP : SUITS.indexOf(state.trump);
  const search = searchFor(trump);
  search.hands.fill(0);
  SEATS.forEach((seat, seatIndex) => {
    for (const card of state.hands[seat]) {
      search.hands[seatIndex * 4 + SUITS.indexOf(card.suit)] |= 1 << (card.rank - 2);
    }
  });

  const leader = SEATS.indexOf(state.current.leader);
  const played = state.current.cards.length;

  const mover = seatToPlay(state);
  const moverIndex = SEATS.indexOf(mover);
  const northSouth = (moverIndex & 1) === 0;
  const left = state.hands[mover].length;

  return legalCards(state).map((card) => {
    const suit = SUITS.indexOf(card.suit);
    const bit = 1 << (card.rank - 2);
    search.hands[moverIndex * 4 + suit] ^= bit;
    // The search reuses these slots for later tricks, so the current trick is written for every card
    state.current.cards.forEach((earlier, index) => {
      search.trickSuit[index] = SUITS.indexOf(earlier.suit);
      search.trickRank[index] = earlier.rank - 2;
    });
    search.trickSuit[played] = suit;
    search.trickRank[played] = card.rank - 2;
    let tricks: number;
    if (played === 3) {
      const winner = (leader + search.winnerIndex(0)) & 3;
      tricks = ((winner & 1) === 0 ? 1 : 0) + search.nsTricks(winner, 0, left - 1);
    } else {
      tricks = search.nsTricks(leader, played + 1, left);
    }
    search.hands[moverIndex * 4 + suit] ^= bit;
    return { card, tricks: northSouth ? tricks : left - tricks };
  });
}

export function bestTricks(state: PlayState): number {
  return Math.max(...solve(state).map((result) => result.tricks));
}
