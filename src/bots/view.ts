import {
  type Auction,
  type Card,
  type CompletedTrick,
  type Hand,
  type PlayState,
  SEATS,
  type Seat,
  type Strain,
  type Trick,
  dummyOf,
  seatToPlay,
  sortHand,
} from '../core';

// Everything a player may know when choosing a card. Bots only ever receive this, never the full deal.
export interface PlayerView {
  // The seat whose card is played now
  readonly seat: Seat;
  // The player who chooses it: declarer also plays the cards of dummy
  readonly actor: Seat;
  readonly declarer: Seat;
  readonly dummy: Seat;
  readonly trump: Strain;
  readonly auction: Auction;
  // The hands the actor can see, always including the hand of `seat`
  readonly hands: Readonly<Partial<Record<Seat, Hand>>>;
  // The cards of the hidden hands together, without their owners
  readonly unseen: Hand;
  readonly completed: readonly CompletedTrick[];
  readonly current: Trick;
}

// `dummyOpen` shows dummy before any card is played, for practice positions that start mid-deal
export function viewOfPlay(state: PlayState, auction: Auction, dummyOpen = false): PlayerView {
  const seat = seatToPlay(state);
  const dummy = dummyOf(state);
  const actor = seat === dummy ? state.declarer : seat;
  // Dummy goes down after the opening lead
  const dummyVisible =
    dummyOpen || state.completed.length > 0 || state.current.cards.length > 0;

  const hands: Partial<Record<Seat, Hand>> = {};
  const unseen: Card[] = [];
  for (const other of SEATS) {
    if (other === actor || other === seat || (other === dummy && dummyVisible)) {
      hands[other] = state.hands[other];
    } else {
      unseen.push(...state.hands[other]);
    }
  }
  return {
    seat,
    actor,
    declarer: state.declarer,
    dummy,
    trump: state.trump,
    auction,
    hands,
    unseen: sortHand(unseen),
    completed: state.completed,
    current: state.current,
  };
}

export function handToPlay(view: PlayerView): Hand {
  return view.hands[view.seat] ?? [];
}

export function legalCardsFor(view: PlayerView): Card[] {
  const hand = handToPlay(view);
  if (view.current.cards.length === 0) return [...hand];
  const ledSuit = view.current.cards[0].suit;
  const following = hand.filter((card) => card.suit === ledSuit);
  return following.length > 0 ? following : [...hand];
}

export function hiddenSeats(view: PlayerView): Seat[] {
  return SEATS.filter((seat) => view.hands[seat] === undefined);
}
