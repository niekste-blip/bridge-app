import { type CardHint, type Moment, cardHint, reviewOf } from '../coach';
import {
  type BotAnswer,
  type BotRequest,
  type Game,
  type Settings,
  THINKING_BUDGET_MS,
  answer,
  quickAnswer,
} from '../game';

// Work that may take a while and therefore runs in the worker
export type Task =
  | { readonly kind: 'bot'; readonly request: BotRequest }
  | { readonly kind: 'hint'; readonly game: Game; readonly settings: Settings }
  | { readonly kind: 'review'; readonly game: Game; readonly settings: Settings };

export type TaskResult = BotAnswer | CardHint | null | Moment[];

// Time for the simulation behind one judged card in the review
const REVIEW_BUDGET_MS = 300;

export function runTask(task: Task): TaskResult {
  switch (task.kind) {
    case 'bot':
      return answer(task.request);
    case 'hint':
      return cardHint(task.game, task.settings, { budgetMs: THINKING_BUDGET_MS });
    case 'review':
      return reviewOf(task.game, task.settings, { budgetMs: REVIEW_BUDGET_MS });
  }
}

// The same work without simulation, for when the worker does not answer in time
export function quickResult(task: Task): TaskResult {
  switch (task.kind) {
    case 'bot':
      return quickAnswer(task.request);
    case 'hint':
      return cardHint(task.game, task.settings, { samples: 0 });
    case 'review':
      return reviewOf(task.game, task.settings, { samples: 0 });
  }
}
