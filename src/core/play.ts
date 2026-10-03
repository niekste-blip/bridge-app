import { type Contract, type Strain } from './auction';
import { type Card, cardId, sameCard } from './cards';
import { type Deal } from './deal';
import { SEATS, type Seat, type Side, partnerOf, seatAfter, sideOf } from './seats';

export interface Trick {
  readonly leader: Seat;
  readonly cards: readonly Card[];
}

export interface CompletedTrick extends Trick {
  readonly winner: Seat;
}

export interface PlayState {
  readonly trump: Strain;
  readonly declarer: Seat;
  readonly hands: Deal;
  readonly completed: readonly CompletedTrick[];
  readonly current: Trick;
}

export function startPlay(deal: Deal, contract: Contract): PlayState {
  return {
    trump: contract.strain,
    declarer: contract.declarer,
    hands: deal,
    completed: [],
    current: { leader: seatAfter(contract.declarer), cards: [] },
  };
}

export function dummyOf(state: PlayState): Seat {
  return partnerOf(state.declarer);
}

export function seatToPlay(state: PlayState): Seat {
  return seatAfter(state.current.leader, state.current.cards.length);
}

export function isPlayComplete(state: PlayState): boolean {
  return SEATS.every((seat) => state.hands[seat].length === 0);
}

export function legalCards(state: PlayState): Card[] {
  const hand = state.hands[seatToPlay(state)];
  if (state.current.cards.length === 0) return [...hand];
  const ledSuit = state.current.cards[0].suit;
  const following = hand.filter((card) => card.suit === ledSuit);
  return following.length > 0 ? following : [...hand];
}

export function trickWinner(trick: Trick, trump: Strain): Seat {
  const ledSuit = trick.cards[0].suit;
  const strength = (card: Card) =>
    card.suit === trump ? 100 + card.rank : card.suit === ledSuit ? card.rank : 0;
  let best = 0;
  trick.cards.forEach((card, i) => {
    if (strength(card) > strength(trick.cards[best])) best = i;
  });
  return seatAfter(trick.leader, best);
}

export function playCard(state: PlayState, card: Card): PlayState {
  if (!legalCards(state).some((legal) => sameCard(legal, card))) {
    throw new Error(`Illegal card: ${cardId(card)}`);
  }
  const seat = seatToPlay(state);
  const hands: Deal = {
    ...state.hands,
    [seat]: state.hands[seat].filter((held) => !sameCard(held, card)),
  };
  const trick: Trick = {
    leader: state.current.leader,
    cards: [...state.current.cards, card],
  };
  if (trick.cards.length < 4) {
    return { ...state, hands, current: trick };
  }
  const winner = trickWinner(trick, state.trump);
  return {
    ...state,
    hands,
    completed: [...state.completed, { ...trick, winner }],
    current: { leader: winner, cards: [] },
  };
}

export function tricksWon(state: PlayState, side: Side): number {
  return state.completed.filter((trick) => sideOf(trick.winner) === side).length;
}
