import { describe, expect, it } from 'vitest';
import { newGame } from './game';
import { DEFAULT_SETTINGS } from './settings';
import { FRESH, load, save } from './storage';

function memoryStore(initial?: string) {
  let text: string | null = initial ?? null;
  return {
    getItem: () => text,
    setItem: (_key: string, value: string) => {
      text = value;
    },
  };
}

describe('storage', () => {
  it('starts fresh when nothing is stored', () => {
    expect(load(memoryStore())).toEqual({ saved: FRESH, recovered: false });
  });

  it('returns what was saved', () => {
    const store = memoryStore();
    const saved = {
      settings: { ...DEFAULT_SETTINGS, level: 'hard' as const, showPoints: false },
      game: newGame(4, 12),
      nextBoard: 5,
    };
    save(store, saved);
    expect(load(store)).toEqual({ saved, recovered: false });
  });

  it('starts fresh and says so when the stored text is not readable', () => {
    expect(load(memoryStore('{ not json'))).toEqual({ saved: FRESH, recovered: true });
    expect(load(memoryStore('42'))).toEqual({ saved: FRESH, recovered: true });
    expect(load(memoryStore('{"version":99,"settings":{}}'))).toEqual({ saved: FRESH, recovered: true });
  });

  it('keeps the settings when only the game is damaged', () => {
    const text = JSON.stringify({
      version: 1,
      settings: { ...DEFAULT_SETTINGS, textSize: 'extraLarge' },
      game: { board: 1 },
      nextBoard: 9,
    });
    const loaded = load(memoryStore(text));
    expect(loaded.recovered).toBe(true);
    expect(loaded.saved.game).toBeNull();
    expect(loaded.saved.settings.textSize).toBe('extraLarge');
    expect(loaded.saved.nextBoard).toBe(9);
  });

  it('drops a game without cards and a setting with an unknown value', () => {
    const text = JSON.stringify({
      version: 1,
      settings: { ...DEFAULT_SETTINGS, level: 'x', textSize: 'huge' },
      game: { auction: { dealer: 'N', calls: [] } },
      nextBoard: 1,
    });
    const loaded = load(memoryStore(text));
    expect(loaded.recovered).toBe(true);
    expect(loaded.saved.game).toBeNull();
    expect(loaded.saved.settings.level).toBe('easy');
    expect(loaded.saved.settings.textSize).toBe('large');
  });

  it('fills in settings that an older version did not have', () => {
    const text = JSON.stringify({ version: 1, settings: { level: 'hard' }, game: null, nextBoard: 2 });
    expect(load(memoryStore(text)).saved.settings).toEqual({ ...DEFAULT_SETTINGS, level: 'hard' });
  });
});
