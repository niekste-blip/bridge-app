import { type Card, SEATS, type Suit, partnerOf, sideOf, trickWinner } from '../core';
import { type PlayerView, legalCardsFor } from './view';

// The rule of thumb behind a card, so that a coach can explain it
export type HeuristicRule =
  | 'draw-trumps'
  | 'cash-winner'
  | 'long-suit'
  | 'second-hand-low'
  | 'cover-honour'
  | 'third-hand-high'
  | 'win-cheaply'
  | 'play-low'
  | 'ruff'
  | 'discard';

export interface HeuristicChoice {
  readonly card: Card;
  readonly rule: HeuristicRule;
}

function lowest(cards: readonly Card[]): Card {
  return cards.reduce((best, card) => (card.rank < best.rank ? card : best));
}

function highest(cards: readonly Card[]): Card {
  return cards.reduce((best, card) => (card.rank > best.rank ? card : best));
}

function inSuit(cards: readonly Card[], suit: Suit): Card[] {
  return cards.filter((card) => card.suit === suit);
}

// Lowest card, from the longest suit when several are equally low
function discard(cards: readonly Card[]): Card {
  return cards.reduce((best, card) => {
    if (card.rank !== best.rank) return card.rank < best.rank ? card : best;
    return inSuit(cards, card.suit).length > inSuit(cards, best.suit).length ? card : best;
  });
}

function lead(view: PlayerView, legal: readonly Card[]): HeuristicChoice {
  const { trump, unseen } = view;
  const declaring = sideOf(view.seat) === sideOf(view.declarer);
  const unseenTrumps = trump === 'NT' ? [] : inSuit(unseen, trump);

  // Declarer draws trumps while the defenders may still have some
  if (declaring && trump !== 'NT' && unseenTrumps.length > 0) {
    const trumps = inSuit(legal, trump);
    if (trumps.length > 0) return { card: highest(trumps), rule: 'draw-trumps' };
  }

  // Cash a card that no opponent can beat
  const dummyCards = declaring ? [] : (view.hands[view.dummy] ?? []);
  const dummyCanRuff = (suit: Suit) =>
    trump !== 'NT' && inSuit(dummyCards, suit).length === 0 && inSuit(dummyCards, trump).length > 0;
  const winners = legal.filter(
    (card) =>
      card.suit !== trump &&
      inSuit(unseen, card.suit).every((other) => other.rank < card.rank) &&
      inSuit(dummyCards, card.suit).every((other) => other.rank < card.rank) &&
      (declaring ? unseenTrumps.length === 0 : !dummyCanRuff(card.suit)),
  );
  if (winners.length > 0) return { card: highest(winners), rule: 'cash-winner' };

  // Longest side suit: top of touching honours, else fourth best, else the lowest
  const sideCards = legal.filter((card) => card.suit !== trump);
  const pool = sideCards.length > 0 ? sideCards : legal;
  let suit = pool[0].suit;
  for (const card of pool) {
    if (inSuit(pool, card.suit).length > inSuit(pool, suit).length) suit = card.suit;
  }
  const cards = inSuit(pool, suit).sort((a, b) => b.rank - a.rank);
  if (cards.length >= 2 && cards[0].rank >= 11 && cards[0].rank - cards[1].rank === 1) {
    return { card: cards[0], rule: 'long-suit' };
  }
  return { card: cards.length >= 4 ? cards[3] : cards[cards.length - 1], rule: 'long-suit' };
}

function follow(view: PlayerView, legal: readonly Card[]): HeuristicChoice {
  const { current, trump } = view;
  const ledSuit = current.cards[0].suit;
  const winnerSeat = trickWinner(current, trump);
  const winnerIndex = (SEATS.indexOf(winnerSeat) - SEATS.indexOf(current.leader) + 4) % 4;
  const winning = current.cards[winnerIndex];
  const partnerWinning = winnerSeat === partnerOf(view.seat);

  const last = current.cards.length === 3;
  if (legal[0].suit === ledSuit) {
    const beating = winning.suit === ledSuit ? legal.filter((card) => card.rank > winning.rank) : [];
    // Partner's trick is safe when nobody plays after me, or when partner is winning with an honour
    const partnerHolds = partnerWinning && (last || winning.rank >= 11 || winning.suit !== ledSuit);
    if (beating.length === 0 || partnerHolds) return { card: lowest(legal), rule: 'play-low' };
    if (last) return { card: lowest(beating), rule: 'win-cheaply' };
    if (current.cards.length === 2) return { card: highest(beating), rule: 'third-hand-high' };
    // Second hand: low, but an honour led by the opponent is covered
    if (winning.rank >= 11) return { card: lowest(beating), rule: 'cover-honour' };
    return { card: lowest(legal), rule: 'second-hand-low' };
  }

  const trumps = trump === 'NT' ? [] : inSuit(legal, trump);
  if (!partnerWinning && trumps.length > 0) {
    const ruffs = winning.suit === trump ? trumps.filter((card) => card.rank > winning.rank) : trumps;
    if (ruffs.length > 0) return { card: lowest(ruffs), rule: 'ruff' };
  }
  const sideCards = legal.filter((card) => card.suit !== trump);
  return { card: discard(sideCards.length > 0 ? sideCards : legal), rule: 'discard' };
}

// The card a player following simple rules of thumb would play, with the rule behind it
export function heuristicChoice(view: PlayerView): HeuristicChoice {
  const legal = legalCardsFor(view);
  if (legal.length === 0) {
    throw new Error('No card to play');
  }
  return view.current.cards.length === 0 ? lead(view, legal) : follow(view, legal);
}

export function heuristicCard(view: PlayerView): Card {
  return heuristicChoice(view).card;
}
