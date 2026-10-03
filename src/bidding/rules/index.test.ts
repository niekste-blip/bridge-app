import { describe, expect, it } from 'vitest';
import { callLabel } from '../labels';
import { ALL_RULES } from './index';

describe('ALL_RULES', () => {
  it('has unique ids', () => {
    const ids = ALL_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers lessons 4 to 7', () => {
    expect([...new Set(ALL_RULES.map((rule) => rule.lesson))].sort()).toEqual([4, 5, 6, 7]);
  });

  it('starts every explanation with the call', () => {
    for (const rule of ALL_RULES) {
      expect(rule.explanation.startsWith(`${callLabel(rule.call)}: `)).toBe(true);
      expect(rule.explanation.endsWith('.')).toBe(true);
    }
  });
});
