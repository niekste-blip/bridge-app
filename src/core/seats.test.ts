import { describe, expect, it } from 'vitest';
import { partnerOf, seatAfter, sideOf } from './seats';

describe('seats', () => {
  it('moves clockwise', () => {
    expect(seatAfter('N')).toBe('E');
    expect(seatAfter('W')).toBe('N');
    expect(seatAfter('S', 3)).toBe('E');
    expect(seatAfter('E', 0)).toBe('E');
  });

  it('finds the partner', () => {
    expect(partnerOf('N')).toBe('S');
    expect(partnerOf('W')).toBe('E');
  });

  it('knows the sides', () => {
    expect(sideOf('N')).toBe('NS');
    expect(sideOf('S')).toBe('NS');
    expect(sideOf('E')).toBe('EW');
    expect(sideOf('W')).toBe('EW');
  });
});
