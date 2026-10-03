import { describe, expect, it } from 'vitest';
import { DOUBLE, PASS, REDOUBLE, bid, parseCard } from '../core';
import { type Result } from '../game';
import { cardLabel, contractText, resultText, scoreText, shortCallLabel, vulnerabilityText } from './text';

const result = (difference: number, userScore: number): Result => ({
  contract: { level: 3, strain: 'NT', doubling: 'none', declarer: 'S' },
  declarerTricks: 9 + difference,
  difference,
  declarerScore: userScore,
  userScore,
});

describe('Dutch texts', () => {
  it('names cards with Dutch honour letters', () => {
    expect(cardLabel(parseCard('SK'))).toBe('♠H');
    expect(cardLabel(parseCard('HQ'))).toBe('♥V');
    expect(cardLabel(parseCard('DJ'))).toBe('♦B');
    expect(cardLabel(parseCard('CT'))).toBe('♣10');
  });

  it('writes calls in short form', () => {
    expect([PASS, DOUBLE, REDOUBLE, bid(1, 'H'), bid(3, 'NT')].map(shortCallLabel)).toEqual([
      'pas',
      'X',
      'XX',
      '1♥',
      '3SA',
    ]);
  });

  it('describes a contract', () => {
    expect(contractText({ level: 3, strain: 'NT', doubling: 'none', declarer: 'S' })).toBe('3SA door Zuid');
    expect(contractText({ level: 4, strain: 'S', doubling: 'doubled', declarer: 'E' })).toBe(
      '4♠ gedoubleerd door Oost',
    );
    expect(contractText({ level: 1, strain: 'C', doubling: 'redoubled', declarer: 'N' })).toBe(
      '1♣ geredoubleerd door Noord',
    );
  });

  it('describes the outcome', () => {
    expect(resultText(result(0, 400))).toBe('Contract precies gemaakt');
    expect(resultText(result(1, 430))).toBe('Contract gemaakt met 1 overslag');
    expect(resultText(result(2, 460))).toBe('Contract gemaakt met 2 overslagen');
    expect(resultText(result(-2, -100))).toBe('2 down');
  });

  it('says which side scores', () => {
    expect(scoreText(result(0, 400))).toBe('400 punten voor Noord-Zuid');
    expect(scoreText(result(-2, -100))).toBe('100 punten voor Oost-West');
  });

  it('describes the vulnerability', () => {
    expect(vulnerabilityText('none')).toBe('Niemand kwetsbaar');
    expect(vulnerabilityText('NS')).toBe('Noord-Zuid kwetsbaar');
  });
});
