import {
  type Card,
  type Deal,
  type Hand,
  type Rng,
  SEATS,
  type Seat,
  type Suit,
  highCardPoints,
  seatAfter,
  suitLength,
} from '../core';
import { type Shown } from '../bidding';
import { type PlayerView, handToPlay, hiddenSeats } from './view';

export type Limits = Readonly<Partial<Record<Seat, Shown>>>;

function emptyRecord<T>(make: () => T): Record<Seat, T> {
  return { N: make(), E: make(), S: make(), W: make() };
}

// The cards every seat has played so far, taken from the tricks
export function cardsPlayedBy(view: PlayerView): Record<Seat, Card[]> {
  const played = emptyRecord<Card[]>(() => []);
  for (const trick of [...view.completed, view.current]) {
    trick.cards.forEach((card, index) => played[seatAfter(trick.leader, index)].push(card));
  }
  return played;
}

// Suits in which a seat failed to follow
export function knownVoids(view: PlayerView): Record<Seat, Set<Suit>> {
  const voids = emptyRecord<Set<Suit>>(() => new Set());
  for (const trick of [...view.completed, view.current]) {
    if (trick.cards.length === 0) continue;
    const ledSuit = trick.cards[0].suit;
    trick.cards.forEach((card, index) => {
      if (card.suit !== ledSuit) voids[seatAfter(trick.leader, index)].add(ledSuit);
    });
  }
  return voids;
}

export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Deals the unseen cards over the hidden seats without breaking a known void; null when it gets stuck
function dealUnseen(
  view: PlayerView,
  hidden: readonly Seat[],
  voids: Record<Seat, Set<Suit>>,
  rng: Rng,
): Partial<Record<Seat, Card[]>> | null {
  const size = handToPlay(view).length;
  const inCurrentTrick = new Set(
    view.current.cards.map((_, index) => seatAfter(view.current.leader, index)),
  );
  const room = new Map<Seat, number>();
  const hands: Partial<Record<Seat, Card[]>> = {};
  for (const seat of hidden) {
    room.set(seat, size - (inCurrentTrick.has(seat) ? 1 : 0));
    hands[seat] = [];
  }
  const allowed = (card: Card) => hidden.filter((seat) => !voids[seat].has(card.suit));
  // Cards that can go to fewer seats are placed first
  const cards = shuffled(view.unseen, rng).sort((a, b) => allowed(a).length - allowed(b).length);
  for (const card of cards) {
    const options = allowed(card).filter((seat) => (room.get(seat) ?? 0) > 0);
    const total = options.reduce((sum, seat) => sum + (room.get(seat) ?? 0), 0);
    if (total === 0) return null;
    let pick = rng() * total;
    let chosen = options[options.length - 1];
    for (const seat of options) {
      pick -= room.get(seat) ?? 0;
      if (pick < 0) {
        chosen = seat;
        break;
      }
    }
    hands[chosen]?.push(card);
    room.set(chosen, (room.get(chosen) ?? 0) - 1);
  }
  return hands;
}

function withinLimits(hand: Hand, limits: Shown | undefined): boolean {
  if (!limits) return true;
  const points = highCardPoints(hand);
  if (points < limits.minHcp || points > limits.maxHcp) return false;
  return (['C', 'D', 'H', 'S'] as const).every(
    (suit) => suitLength(hand, suit) >= limits.minLength[suit],
  );
}

// A full deal that agrees with everything the actor knows: the visible hands, the cards played,
// the known voids and, when it can be done within `maxTries`, what the hidden players showed in the bidding
export function sampleDeal(view: PlayerView, rng: Rng, limits: Limits = {}, maxTries = 40): Deal {
  const hidden = hiddenSeats(view);
  const voids = knownVoids(view);
  const played = cardsPlayedBy(view);
  let fallback: Partial<Record<Seat, Card[]>> | null = null;
  let chosen: Partial<Record<Seat, Card[]>> | null = null;
  for (let attempt = 0; attempt < maxTries && !chosen; attempt++) {
    const hands = dealUnseen(view, hidden, voids, rng);
    if (!hands) continue;
    fallback = hands;
    const fits = hidden.every((seat) =>
      withinLimits([...(hands[seat] ?? []), ...played[seat]], limits[seat]),
    );
    if (fits) chosen = hands;
  }
  const hands = chosen ?? fallback ?? dealUnseen(view, hidden, emptyRecord(() => new Set()), rng) ?? {};
  const deal = emptyRecord<Hand>(() => []);
  for (const seat of SEATS) {
    deal[seat] = view.hands[seat] ?? hands[seat] ?? [];
  }
  return deal;
}
