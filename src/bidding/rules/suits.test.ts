import { describe, expect, it } from 'vitest';
import { isMajor, minLengths, suitsAbove, suitsBelow } from './suits';

describe('suit helpers', () => {
  it('knows the majors', () => {
    expect(['C', 'D', 'H', 'S'].map((s) => isMajor(s as 'C'))).toEqual([false, false, true, true]);
  });

  it('lists higher and lower suits in rank order', () => {
    expect(suitsAbove('D')).toEqual(['H', 'S']);
    expect(suitsAbove('S')).toEqual([]);
    expect(suitsBelow('H')).toEqual(['C', 'D']);
    expect(suitsBelow('C')).toEqual([]);
  });

  it('builds a table of minimum lengths', () => {
    expect(minLengths(['D', 'H'], (suit) => (suit === 'H' ? 5 : 4))).toEqual({ D: 4, H: 5 });
    expect(minLengths([], () => 4)).toEqual({});
  });
});
