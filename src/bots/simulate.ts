import { type Card, type PlayState, type Rng, cardId } from '../core';
import { solve } from '../solver';
import { type Limits, sampleDeal } from './sample';
import { type PlayerView } from './view';

export interface Evaluation {
  readonly card: Card;
  // Average number of tricks for the side to play over all sampled deals
  readonly average: number;
}

export interface SimulationOptions {
  readonly samples: number;
  readonly rng: Rng;
  readonly limits?: Limits;
  // Stop early when this much time has passed and at least one deal was solved
  readonly budgetMs?: number;
  readonly now?: () => number;
}

const MIN_SAMPLES = 1;

// Deals the hidden cards at random many times and solves every deal with open cards
export function evaluateCards(view: PlayerView, options: SimulationOptions): Evaluation[] {
  const now = options.now ?? (() => performance.now());
  const start = now();
  const totals = new Map<string, { card: Card; sum: number }>();
  let solved = 0;
  for (let sample = 0; sample < options.samples; sample++) {
    if (
      options.budgetMs !== undefined &&
      solved >= MIN_SAMPLES &&
      now() - start > options.budgetMs
    ) {
      break;
    }
    const state: PlayState = {
      trump: view.trump,
      declarer: view.declarer,
      hands: sampleDeal(view, options.rng, options.limits),
      completed: view.completed,
      current: view.current,
    };
    for (const result of solve(state)) {
      const id = cardId(result.card);
      const entry = totals.get(id) ?? { card: result.card, sum: 0 };
      entry.sum += result.tricks;
      totals.set(id, entry);
    }
    solved++;
  }
  return [...totals.values()].map(({ card, sum }) => ({ card, average: sum / solved }));
}
