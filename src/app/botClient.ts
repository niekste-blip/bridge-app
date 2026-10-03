import { type CardHint, type Moment } from '../coach';
import { type BotAnswer, type BotRequest, type Game, type Settings } from '../game';
import { type Task, type TaskResult, quickResult } from './tasks';

// Work that has not come back after this long is redone without simulation
const TIMEOUT_MS = 5000;
// The review judges many cards and gets more time
const REVIEW_TIMEOUT_MS = 20000;

interface Waiting {
  readonly task: Task;
  readonly resolve: (result: TaskResult) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, Waiting>();

// Stops the worker and answers everything that was waiting without simulation.
// A worker that is too slow, or that could not be loaded, would otherwise hold up every later task.
function abandonWorker(): void {
  worker?.terminate();
  worker = null;
  for (const [id, entry] of [...waiting]) {
    waiting.delete(id);
    clearTimeout(entry.timer);
    entry.resolve(quickResult(entry.task));
  }
}

function taskWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./botWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; result: TaskResult }>) => {
      const entry = waiting.get(event.data.id);
      if (!entry) return;
      waiting.delete(event.data.id);
      clearTimeout(entry.timer);
      entry.resolve(event.data.result);
    };
    worker.onerror = abandonWorker;
  }
  return worker;
}

function run(task: Task, timeoutMs: number): Promise<TaskResult> {
  return new Promise((resolve) => {
    const id = nextId++;
    waiting.set(id, { task, resolve, timer: setTimeout(abandonWorker, timeoutMs) });
    try {
      taskWorker().postMessage({ id, task });
    } catch {
      abandonWorker();
    }
  });
}

export function askBot(request: BotRequest): Promise<BotAnswer> {
  return run({ kind: 'bot', request }, TIMEOUT_MS) as Promise<BotAnswer>;
}

export function askHint(game: Game, settings: Settings): Promise<CardHint | null> {
  return run({ kind: 'hint', game, settings }, TIMEOUT_MS) as Promise<CardHint | null>;
}

export function askReview(game: Game, settings: Settings): Promise<Moment[]> {
  return run({ kind: 'review', game, settings }, REVIEW_TIMEOUT_MS) as Promise<Moment[]>;
}
