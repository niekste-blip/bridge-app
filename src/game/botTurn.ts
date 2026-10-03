import { type Auction, type Card, type Hand, type Seat, seatToCall, seededRng, sideOf } from '../core';
import { type Choice } from '../bidding';
import {
  type Level,
  type PlayerView,
  botCall,
  botCard,
  heuristicCard,
  viewOfPlay,
} from '../bots';
import { type Game, PARTNER, USER, botCallIn, botCardIn, newGame, phaseOf, turnOf } from './game';
import { type Settings } from './settings';

export type BotRequest =
  | {
      readonly kind: 'call';
      readonly hand: Hand;
      readonly auction: Auction;
      readonly level: Level;
      readonly progressLesson: number;
    }
  | {
      readonly kind: 'card';
      readonly view: PlayerView;
      readonly level: Level;
      readonly seed: number;
      readonly budgetMs: number;
      readonly progressLesson: number;
    };

export type BotAnswer =
  | { readonly kind: 'call'; readonly choice: Choice }
  | { readonly kind: 'card'; readonly card: Card };

// Time a bot may spend simulating before it has to play
export const THINKING_BUDGET_MS = 1500;
const MAX_DEALS = 500;

// The partner of the user always plays at the hard level
export function levelFor(seat: Seat, settings: Settings): Level {
  return sideOf(seat) === sideOf(USER) ? 'hard' : settings.level;
}

// What to ask a bot now; null when it is the turn of the user or the game is over
export function botRequestFor(game: Game, settings: Settings): BotRequest | null {
  const turn = turnOf(game);
  if (!turn || turn.byUser) return null;
  const level = levelFor(turn.actor, settings);
  if (turn.kind === 'call') {
    return {
      kind: 'call',
      hand: game.deal[turn.seat],
      auction: game.auction,
      level,
      progressLesson: settings.progressLesson,
    };
  }
  if (!game.play) return null;
  const cardsPlayed = game.play.completed.length * 4 + game.play.current.cards.length;
  return {
    kind: 'card',
    view: viewOfPlay(game.play, game.auction),
    level,
    seed: game.seed * 100 + cardsPlayed,
    budgetMs: THINKING_BUDGET_MS,
    progressLesson: settings.progressLesson,
  };
}

export function answer(request: BotRequest): BotAnswer {
  if (request.kind === 'call') {
    const choice = botCall(request.hand, request.auction, request.level, request.progressLesson);
    return { kind: 'call', choice };
  }
  const card = botCard(request.view, request.level, seededRng(request.seed), {
    budgetMs: request.budgetMs,
    progressLesson: request.progressLesson,
  });
  return { kind: 'card', card };
}

// The same decision without simulation, for when the full answer takes too long
export function quickAnswer(request: BotRequest): BotAnswer {
  if (request.kind === 'call') return answer(request);
  return { kind: 'card', card: heuristicCard(request.view) };
}

export function applyAnswer(game: Game, botAnswer: BotAnswer): Game {
  return botAnswer.kind === 'call'
    ? botCallIn(game, botAnswer.choice)
    : botCardIn(game, botAnswer.card);
}

// Lets the bots bid all four hands
export function bidOutByBots(game: Game, settings: Settings): Game {
  let current = game;
  while (phaseOf(current) === 'auction') {
    const seat = seatToCall(current.auction);
    const level = seat === USER || seat === PARTNER ? 'hard' : settings.level;
    const choice = botCall(current.deal[seat], current.auction, level, settings.progressLesson);
    current = botCallIn(current, choice);
  }
  return current;
}

// For playing without bidding: the first deal from `firstSeed` on which the user becomes declarer
export function newDeclarerGame(board: number, firstSeed: number, settings: Settings): Game {
  for (let seed = firstSeed; seed < firstSeed + MAX_DEALS; seed++) {
    const game = bidOutByBots(newGame(board, seed), settings);
    if (game.contract?.declarer === USER) return game;
  }
  throw new Error('No deal found with the user as declarer');
}
