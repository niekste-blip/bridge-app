import { type Task, runTask } from './tasks';

// Bots, hints and the review run off the main thread, so the screen stays responsive
self.onmessage = (event: MessageEvent<{ id: number; task: Task }>) => {
  const { id, task } = event.data;
  self.postMessage({ id, result: runTask(task) });
};
