import { type BotRequest, answer } from '../game';

// Runs the bots off the main thread, so the screen stays responsive while a bot thinks
self.onmessage = (event: MessageEvent<{ id: number; request: BotRequest }>) => {
  const { id, request } = event.data;
  self.postMessage({ id, answer: answer(request) });
};
