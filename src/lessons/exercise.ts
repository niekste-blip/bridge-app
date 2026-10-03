import {
  type Auction,
  type Call,
  type Card,
  type Hand,
  type PlayState,
  type Seat,
  auctionFrom,
  dummyOf,
  newAuction,
  parseCard,
  parseHand,
  sameCall,
  seatToCall,
  seatToPlay,
  seededRng,
  sideOf,
  tricksWon,
} from '../core';
import { type Choice, chooseCall } from '../bidding';
import { botCard, viewOfPlay } from '../bots';
import { solve } from '../solver';
import { type BidExercise, type PlayExercise } from './types';

// In a play exercise South is declarer and North is dummy
const DECLARER: Seat = 'S';
const NO_AUCTION: Auction = newAuction('N');
const DEFENDER_SAMPLES = 30;

export interface BidSetup {
  readonly hand: Hand;
  readonly auction: Auction;
  // The seat of the student
  readonly seat: Seat;
}

export function bidSetup(exercise: BidExercise): BidSetup {
  const auction = auctionFrom(exercise.dealer, exercise.auction);
  return { hand: parseHand(exercise.hand), auction, seat: seatToCall(auction) };
}

// The right answer: what the rules up to and including this lesson prescribe
export function bidAnswer(exercise: BidExercise, lessonNumber: number): Choice {
  const { hand, auction } = bidSetup(exercise);
  return chooseCall(hand, auction, { maxLesson: lessonNumber });
}

export function isRightCall(exercise: BidExercise, lessonNumber: number, call: Call): boolean {
  return sameCall(bidAnswer(exercise, lessonNumber).call, call);
}

function cards(text: string): Card[] {
  return text.trim().split(/\s+/).map(parseCard);
}

export function startPosition(exercise: PlayExercise): PlayState {
  return {
    trump: exercise.trump,
    declarer: DECLARER,
    hands: {
      N: cards(exercise.hands.N),
      E: cards(exercise.hands.E),
      S: cards(exercise.hands.S),
      W: cards(exercise.hands.W),
    },
    completed: [],
    current: { leader: exercise.leader, cards: [] },
  };
}

// True when the student chooses the next card: South plays both the North and the South hand
export function studentToPlay(state: PlayState): boolean {
  return sideOf(seatToPlay(state)) === sideOf(DECLARER);
}

export function tricksForStudent(state: PlayState): number {
  return tricksWon(state, sideOf(DECLARER));
}

// The most tricks North-South can take against perfect defence
export function bestPossible(exercise: PlayExercise): number {
  const state = startPosition(exercise);
  const results = solve(state).map((result) => result.tricks);
  const size = state.hands[seatToPlay(state)].length;
  return studentToPlay(state) ? Math.max(...results) : size - Math.max(...results);
}

// The card a strong defender plays; the positions are small, so this is quick
export function defenderCard(state: PlayState, seed: number): Card {
  const view = viewOfPlay(state, NO_AUCTION, true);
  return botCard(view, 'hard', seededRng(seed), { samples: DEFENDER_SAMPLES });
}

export function dummySeat(state: PlayState): Seat {
  return dummyOf(state);
}
