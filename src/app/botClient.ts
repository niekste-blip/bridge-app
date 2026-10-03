import { type BotAnswer, type BotRequest, quickAnswer } from '../game';

// A bot that has not answered after this long is replaced by rules of thumb
const TIMEOUT_MS = 5000;

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, (answer: BotAnswer) => void>();

function botWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./botWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; answer: BotAnswer }>) => {
      const resolve = waiting.get(event.data.id);
      waiting.delete(event.data.id);
      resolve?.(event.data.answer);
    };
  }
  return worker;
}

export function askBot(request: BotRequest): Promise<BotAnswer> {
  return new Promise((resolve) => {
    const id = nextId++;
    const fallback = () => {
      waiting.delete(id);
      resolve(quickAnswer(request));
    };
    const timer = setTimeout(fallback, TIMEOUT_MS);
    waiting.set(id, (answer) => {
      clearTimeout(timer);
      resolve(answer);
    });
    try {
      botWorker().postMessage({ id, request });
    } catch {
      clearTimeout(timer);
      fallback();
    }
  });
}
