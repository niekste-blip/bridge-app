import {
  type Auction,
  type Call,
  type Card,
  type Contract,
  type Deal,
  type Hand,
  type PlayState,
  SEATS,
  type Seat,
  type Vulnerability,
  addCall,
  contractOf,
  dealCards,
  dealerForBoard,
  dummyOf,
  isAuctionComplete,
  isPlayComplete,
  newAuction,
  playCard,
  scoreContract,
  seatToCall,
  seatToPlay,
  seededRng,
  sideOf,
  startPlay,
  tricksWon,
  vulnerabilityForBoard,
} from '../core';
import { type Choice } from '../bidding';

// The person at the tablet always sits South; North is the partner
export const USER: Seat = 'S';
export const PARTNER: Seat = 'N';

export interface Game {
  readonly board: number;
  readonly seed: number;
  readonly dealer: Seat;
  readonly vulnerability: Vulnerability;
  // The four hands as dealt
  readonly deal: Deal;
  readonly auction: Auction;
  // One entry per call: the explanation a bot gave, or null for a call by the user
  readonly notes: readonly (string | null)[];
  readonly contract: Contract | null;
  readonly play: PlayState | null;
  // The game before the last move of the user, while that move can still be taken back
  readonly undo: Game | null;
}

export type Phase = 'auction' | 'play' | 'passedOut' | 'finished';

export interface Turn {
  readonly kind: 'call' | 'card';
  // The seat that calls, or whose card is played
  readonly seat: Seat;
  // The player who decides: declarer also plays the cards of dummy
  readonly actor: Seat;
  readonly byUser: boolean;
}

export interface Result {
  readonly contract: Contract;
  readonly declarerTricks: number;
  // Tricks above (positive) or below (negative) the contract
  readonly difference: number;
  readonly declarerScore: number;
  // The same score seen from the side of the user
  readonly userScore: number;
}

export function newGame(board: number, seed: number): Game {
  const dealer = dealerForBoard(board);
  return {
    board,
    seed,
    dealer,
    vulnerability: vulnerabilityForBoard(board),
    deal: dealCards(seededRng(seed)),
    auction: newAuction(dealer),
    notes: [],
    contract: null,
    play: null,
    undo: null,
  };
}

export function phaseOf(game: Game): Phase {
  if (!isAuctionComplete(game.auction)) return 'auction';
  if (!game.play) return 'passedOut';
  return isPlayComplete(game.play) ? 'finished' : 'play';
}

export function turnOf(game: Game): Turn | null {
  const phase = phaseOf(game);
  if (phase === 'auction') {
    const seat = seatToCall(game.auction);
    return { kind: 'call', seat, actor: seat, byUser: seat === USER };
  }
  if (phase === 'play' && game.play) {
    const seat = seatToPlay(game.play);
    const actor = seat === dummyOf(game.play) ? game.play.declarer : seat;
    return { kind: 'card', seat, actor, byUser: actor === USER };
  }
  return null;
}

function addCallTo(game: Game, call: Call, note: string | null): Game {
  const auction = addCall(game.auction, call);
  const notes = [...game.notes, note];
  if (!isAuctionComplete(auction)) return { ...game, auction, notes };
  const contract = contractOf(auction);
  return {
    ...game,
    auction,
    notes,
    contract,
    play: contract ? startPlay(game.deal, contract) : null,
    undo: null,
  };
}

function addCardTo(game: Game, card: Card): Game {
  if (!game.play) {
    throw new Error('No play in progress');
  }
  const play = playCard(game.play, card);
  const trickFinished = play.completed.length > game.play.completed.length;
  return { ...game, play, undo: trickFinished ? null : game.undo };
}

// A move by the user can be taken back until the auction ends or the trick is complete
export function userCall(game: Game, call: Call): Game {
  const before = { ...game, undo: null };
  const after = addCallTo(before, call, null);
  return phaseOf(after) === 'auction' ? { ...after, undo: before } : after;
}

export function userCard(game: Game, card: Card): Game {
  const before = { ...game, undo: null };
  const after = addCardTo(before, card);
  const trickFinished = (after.play?.completed.length ?? 0) > (before.play?.completed.length ?? 0);
  return trickFinished ? after : { ...after, undo: before };
}

export function botCallIn(game: Game, choice: Choice): Game {
  return addCallTo(game, choice.call, choice.explanation);
}

export function botCardIn(game: Game, card: Card): Game {
  return addCardTo(game, card);
}

export function canUndo(game: Game): boolean {
  return game.undo !== null;
}

export function undoMove(game: Game): Game {
  return game.undo ?? game;
}

// The hands the user may look at
export function visibleSeats(game: Game): Seat[] {
  const phase = phaseOf(game);
  if (phase === 'finished' || phase === 'passedOut') return [...SEATS];
  if (phase === 'auction' || !game.play) return [USER];
  const dummy = dummyOf(game.play);
  const leadMade = game.play.completed.length > 0 || game.play.current.cards.length > 0;
  return SEATS.filter(
    (seat) =>
      seat === USER ||
      (seat === dummy && leadMade) ||
      // As dummy the user watches partner play the hand
      (seat === PARTNER && dummy === USER),
  );
}

// The cards a seat holds right now
export function handOf(game: Game, seat: Seat): Hand {
  return game.play ? game.play.hands[seat] : game.deal[seat];
}

export function resultOf(game: Game): Result | null {
  if (phaseOf(game) !== 'finished' || !game.play || !game.contract) return null;
  const contract = game.contract;
  const side = sideOf(contract.declarer);
  const declarerTricks = tricksWon(game.play, side);
  const declarerScore = scoreContract(contract, declarerTricks, game.vulnerability);
  return {
    contract,
    declarerTricks,
    difference: declarerTricks - (contract.level + 6),
    declarerScore,
    userScore: side === sideOf(USER) ? declarerScore : -declarerScore,
  };
}
