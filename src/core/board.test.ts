import { describe, expect, it } from 'vitest';
import { dealerForBoard, isVulnerable, vulnerabilityForBoard } from './board';

describe('dealerForBoard', () => {
  it('rotates every board', () => {
    expect([1, 2, 3, 4, 5, 17].map(dealerForBoard)).toEqual(['N', 'E', 'S', 'W', 'N', 'N']);
  });
});

describe('vulnerabilityForBoard', () => {
  it('follows the standard 16-board cycle', () => {
    const boards = Array.from({ length: 16 }, (_, i) => vulnerabilityForBoard(i + 1));
    expect(boards).toEqual([
      'none', 'NS', 'EW', 'all',
      'NS', 'EW', 'all', 'none',
      'EW', 'all', 'none', 'NS',
      'all', 'none', 'NS', 'EW',
    ]);
  });

  it('repeats after 16 boards', () => {
    expect(vulnerabilityForBoard(17)).toBe('none');
    expect(vulnerabilityForBoard(20)).toBe('all');
  });
});

describe('isVulnerable', () => {
  it('checks one side', () => {
    expect(isVulnerable('NS', 'none')).toBe(false);
    expect(isVulnerable('NS', 'NS')).toBe(true);
    expect(isVulnerable('EW', 'NS')).toBe(false);
    expect(isVulnerable('EW', 'all')).toBe(true);
  });
});
