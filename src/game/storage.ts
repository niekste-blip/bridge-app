import { NO_PROGRESS, type Progress } from '../lessons';
import { type Game, phaseOf } from './game';
import { DEFAULT_SETTINGS, type Settings } from './settings';

const KEY = 'bridge-app';
const VERSION = 1;

export interface Saved {
  readonly settings: Settings;
  readonly game: Game | null;
  // Number of the next board to deal
  readonly nextBoard: number;
  // Finished lessons and the exercises that still need practice
  readonly progress: Progress;
}

export interface Loaded {
  readonly saved: Saved;
  // True when stored data was unreadable and has been replaced by a fresh start
  readonly recovered: boolean;
}

export const FRESH: Saved = {
  settings: DEFAULT_SETTINGS,
  game: null,
  nextBoard: 1,
  progress: NO_PROGRESS,
};

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function usableProgress(value: unknown): Progress {
  if (!isRecord(value) || !Array.isArray(value.completed) || !Array.isArray(value.trouble)) {
    return NO_PROGRESS;
  }
  return {
    completed: value.completed.filter((item): item is number => typeof item === 'number'),
    trouble: value.trouble.filter(
      (item): item is Progress['trouble'][number] =>
        isRecord(item) && typeof item.id === 'string' && typeof item.streak === 'number',
    ),
  };
}

function usableGame(value: unknown): Game | null {
  if (!isRecord(value) || !isRecord(value.deal) || !Array.isArray(value.notes)) return null;
  const deal = value.deal;
  if (!['N', 'E', 'S', 'W'].every((seat) => Array.isArray(deal[seat]))) return null;
  try {
    phaseOf(value as unknown as Game);
    return value as unknown as Game;
  } catch {
    return null;
  }
}

// Stored settings with a value this version does not know fall back to the default for that setting
function usableSettings(value: Record<string, unknown>): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...value } as Settings;
  return {
    ...merged,
    level: ['easy', 'medium', 'hard'].includes(merged.level) ? merged.level : DEFAULT_SETTINGS.level,
    textSize: ['normal', 'large', 'extraLarge'].includes(merged.textSize)
      ? merged.textSize
      : DEFAULT_SETTINGS.textSize,
  };
}

export function load(store: Store): Loaded {
  const text = store.getItem(KEY);
  if (text === null) return { saved: FRESH, recovered: false };
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data) || data.version !== VERSION || !isRecord(data.settings)) {
      return { saved: FRESH, recovered: true };
    }
    const settings = usableSettings(data.settings);
    const nextBoard = typeof data.nextBoard === 'number' && data.nextBoard >= 1 ? data.nextBoard : 1;
    const game = data.game === null ? null : usableGame(data.game);
    const progress = usableProgress(data.progress);
    // The settings, the board number and the lesson progress survive a damaged game
    return {
      saved: { settings, game, nextBoard, progress },
      recovered: data.game !== null && game === null,
    };
  } catch {
    return { saved: FRESH, recovered: true };
  }
}

export function save(store: Store, saved: Saved): void {
  store.setItem(KEY, JSON.stringify({ version: VERSION, ...saved }));
}
