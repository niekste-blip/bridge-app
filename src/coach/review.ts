import {
  callerAt,
  dummyOf,
  legalCards,
  playCard,
  sameCall,
  sameCard,
  seatToPlay,
  seededRng,
  startPlay,
} from '../core';
import { callLabel, chooseCall } from '../bidding';
import { SIMULATION_MAX_CARDS, evaluateCards, limitsFor, viewOfPlay } from '../bots';
import { type Game, type Settings, USER } from '../game';
import { adviceLesson, cardName, lessonFor, tricksText } from './hint';

export interface Moment {
  readonly kind: 'call' | 'card';
  readonly text: string;
  // Used to put the most important moment first
  readonly weight: number;
}

export interface ReviewOptions {
  // 0 skips the review of the card play
  readonly samples?: number;
  readonly budgetMs?: number;
  readonly now?: () => number;
}

export const MAX_MOMENTS = 3;
// A card is only mentioned when it costs at least this many tricks on average
const MIN_LOSS = 1;
// Bidding moments come before card moments
const CALL_WEIGHT = 100;
const REVIEW_SAMPLES = 30;

function callMoments(game: Game, settings: Settings): Moment[] {
  const moments: Moment[] = [];
  game.auction.calls.forEach((call, index) => {
    // A call with a note was made by a bot, also when the bots bid the hand of the user
    if (callerAt(game.auction, index) !== USER || game.notes[index] !== null) return;
    const before = { dealer: game.auction.dealer, calls: game.auction.calls.slice(0, index) };
    const advice = chooseCall(game.deal[USER], before, { maxLesson: adviceLesson(settings) });
    if (advice.source !== 'rule' || sameCall(advice.call, call)) return;
    const did = call.type === 'pass' ? 'u paste' : `u bood ${callLabel(call)}`;
    moments.push({
      kind: 'call',
      text: `Bieden: ${did}. Volgens de afspraken is het ${advice.explanation}`,
      weight: CALL_WEIGHT - index,
    });
  });
  return moments;
}

function cardMoments(game: Game, settings: Settings, options: ReviewOptions): Moment[] {
  const samples = options.samples ?? REVIEW_SAMPLES;
  if (samples === 0 || !game.play || !game.contract) return [];
  const moments: Moment[] = [];
  let state = startPlay(game.deal, game.contract);
  const cards = [...game.play.completed, game.play.current].flatMap((trick) => trick.cards);

  cards.forEach((card, cardsPlayed) => {
    const seat = seatToPlay(state);
    const dummy = dummyOf(state);
    const actor = seat === dummy ? state.declarer : seat;
    const judged =
      actor === USER &&
      legalCards(state).length > 1 &&
      state.hands[seat].length <= SIMULATION_MAX_CARDS;
    if (judged) {
      const view = viewOfPlay(state, game.auction);
      const evaluations = evaluateCards(view, {
        samples,
        rng: seededRng(game.seed * 100 + cardsPlayed + 50),
        limits: limitsFor(view, lessonFor(settings)),
        budgetMs: options.budgetMs,
        now: options.now,
      });
      const best = evaluations.reduce((a, b) => (b.average > a.average ? b : a));
      const played = evaluations.find((evaluation) => sameCard(evaluation.card, card));
      const loss = played ? best.average - played.average : 0;
      if (loss >= MIN_LOSS) {
        const from = seat === dummy ? ' uit de dummy' : '';
        moments.push({
          kind: 'card',
          text: `Slag ${state.completed.length + 1}: u speelde ${cardName(card)}${from}. Met ${cardName(best.card)} haalt u gemiddeld ${tricksText(loss)} slag meer.`,
          weight: loss,
        });
      }
    }
    state = playCard(state, card);
  });
  return moments;
}

// At most three things to learn from this board, the most important first
export function reviewOf(game: Game, settings: Settings, options: ReviewOptions = {}): Moment[] {
  return [...callMoments(game, settings), ...cardMoments(game, settings, options)]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_MOMENTS);
}
