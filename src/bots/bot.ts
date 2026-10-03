import { type Auction, type Card, type Hand, type Rng, sameCard } from '../core';
import { ALL_RULES, type Choice, chooseCall, shownBy } from '../bidding';
import { heuristicCard } from './heuristic';
import { type Limits } from './sample';
import { evaluateCards } from './simulate';
import { type PlayerView, handToPlay, hiddenSeats, legalCardsFor } from './view';

export type Level = 'easy' | 'medium' | 'hard';

interface LevelSettings {
  // Highest lesson whose bidding rules the bot uses
  readonly lessonCap: number;
  // Deals to sample per card decision; 0 means rules of thumb only
  readonly samples: number;
  // Chance to play the second best card
  readonly slipChance: number;
}

const SETTINGS: Readonly<Record<Level, LevelSettings>> = {
  easy: { lessonCap: 7, samples: 0, slipChance: 0 },
  medium: { lessonCap: 10, samples: 20, slipChance: 0.15 },
  hard: { lessonCap: 13, samples: 100, slipChance: 0 },
};

// Opening, response and rebid belong together: a bot never knows less than lesson 7
export const BASE_LESSON = 7;
// With more cards than this in hand the search is too slow, and the bot plays by rules of thumb
export const SIMULATION_MAX_CARDS = 8;
const EPSILON = 1e-9;

export function lessonLimit(level: Level, progressLesson: number): number {
  return Math.max(BASE_LESSON, Math.min(SETTINGS[level].lessonCap, progressLesson));
}

// What the hidden players showed in the bidding, as limits for the simulation
export function limitsFor(view: PlayerView, maxLesson: number): Limits {
  return Object.fromEntries(
    hiddenSeats(view).map((seat) => [seat, shownBy(ALL_RULES, view.auction, seat, maxLesson)]),
  );
}

export function botCall(hand: Hand, auction: Auction, level: Level, progressLesson = 13): Choice {
  return chooseCall(hand, auction, { maxLesson: lessonLimit(level, progressLesson) });
}

export interface CardOptions {
  readonly samples?: number;
  readonly maxCards?: number;
  readonly budgetMs?: number;
  readonly now?: () => number;
  readonly progressLesson?: number;
}

export function botCard(view: PlayerView, level: Level, rng: Rng, options: CardOptions = {}): Card {
  const legal = legalCardsFor(view);
  if (legal.length === 1) return legal[0];
  const byRulesOfThumb = heuristicCard(view);
  const settings = SETTINGS[level];
  // A level that plays by rules of thumb stays that way, whatever the options say
  const samples = settings.samples === 0 ? 0 : (options.samples ?? settings.samples);
  if (samples === 0 || handToPlay(view).length > (options.maxCards ?? SIMULATION_MAX_CARDS)) {
    return byRulesOfThumb;
  }

  const evaluations = evaluateCards(view, {
    samples,
    rng,
    limits: limitsFor(view, lessonLimit(level, options.progressLesson ?? 13)),
    budgetMs: options.budgetMs,
    now: options.now,
  });

  const best = Math.max(...evaluations.map((evaluation) => evaluation.average));
  const isBest = (average: number) => best - average < EPSILON;
  if (rng() < settings.slipChance) {
    const rest = evaluations.filter((evaluation) => !isBest(evaluation.average));
    if (rest.length > 0) {
      const secondBest = Math.max(...rest.map((evaluation) => evaluation.average));
      return pick(rest.filter((e) => secondBest - e.average < EPSILON).map((e) => e.card), byRulesOfThumb);
    }
  }
  return pick(evaluations.filter((e) => isBest(e.average)).map((e) => e.card), byRulesOfThumb);
}

// Among equally good cards: the rule-of-thumb card when it is one of them, else the lowest
function pick(cards: readonly Card[], preferred: Card): Card {
  return (
    cards.find((card) => sameCard(card, preferred)) ??
    cards.reduce((lowest, card) => (card.rank < lowest.rank ? card : lowest))
  );
}
