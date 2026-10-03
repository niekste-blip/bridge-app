import { describe, expect, it } from 'vitest';
import { DOUBLE, PASS, REDOUBLE, bid } from '../core';
import { SUIT_NAME, callLabel } from './labels';

describe('labels', () => {
  it('names the suits in Dutch', () => {
    expect(SUIT_NAME).toEqual({ C: 'klaveren', D: 'ruiten', H: 'harten', S: 'schoppen' });
  });

  it('writes calls in Dutch notation', () => {
    expect(callLabel(bid(1, 'H'))).toBe('1♥');
    expect(callLabel(bid(2, 'C'))).toBe('2♣');
    expect(callLabel(bid(3, 'NT'))).toBe('3SA');
    expect(callLabel(PASS)).toBe('Pas');
    expect(callLabel(DOUBLE)).toBe('Doublet');
    expect(callLabel(REDOUBLE)).toBe('Redoublet');
  });
});
