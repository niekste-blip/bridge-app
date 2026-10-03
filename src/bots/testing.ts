import {
  type Auction,
  type Card,
  type Deal,
  type PlayState,
  type Seat,
  type Strain,
  isPlayComplete,
  newAuction,
  parseCard,
  playCard,
} from '../core';
import { type PlayerView, viewOfPlay } from './view';

// Test helpers: small positions written as card ids, and playing a deal to the end

export function hands(north: string, east: string, south: string, west: string): Deal {
  const parse = (text: string) => (text === '' ? [] : text.split(' ').map(parseCard));
  return { N: parse(north), E: parse(east), S: parse(south), W: parse(west) };
}

// A position at the start of a trick, after one earlier trick so that dummy is on the table
export function position(deal: Deal, trump: Strain, declarer: Seat, leader: Seat): PlayState {
  return {
    trump,
    declarer,
    hands: deal,
    completed: [{ leader, cards: [], winner: leader }],
    current: { leader, cards: [] },
  };
}

export function play(state: PlayState, ...ids: string[]): PlayState {
  return ids.reduce((current, id) => playCard(current, parseCard(id)), state);
}

export function viewAt(state: PlayState, auction: Auction = newAuction('N')): PlayerView {
  return viewOfPlay(state, auction);
}

export function playOut(
  state: PlayState,
  auction: Auction,
  choose: (view: PlayerView) => Card,
): PlayState {
  let current = state;
  while (!isPlayComplete(current)) {
    current = playCard(current, choose(viewOfPlay(current, auction)));
  }
  return current;
}
