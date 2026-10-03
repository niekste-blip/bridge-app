import { describe, expect, it } from 'vitest';
import { partnerOf, seatAfter, sideOf } from './seats';

describe('seats', () => {
  it('moves clockwise', () => {
    expect(seatAfter('N')).toBe('E');
    expect(seatAfter('W')).toBe('N');
    expect(seatAfter('S', 3)).toBe('E');
    expect(seatAfter('E', 0)).toBe('E');
  });

  it('wraps around for negative and large steps', () => {
    expect(seatAfter('N', -1)).toBe('W');
    expect(seatAfter('E', -1)).toBe('N');
    expect(seatAfter('S', -5)).toBe('E');
    expect(seatAfter('N', 8)).toBe('N');
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
