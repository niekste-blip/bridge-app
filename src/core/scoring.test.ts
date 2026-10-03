import { describe, expect, it } from 'vitest';
import { type Contract, type Doubling, type Level, type Strain } from './auction';
import { type Vulnerability } from './board';
import { scoreContract } from './scoring';

function score(
  level: Level,
  strain: Strain,
  tricks: number,
  vulnerability: Vulnerability = 'none',
  doubling: Doubling = 'none',
): number {
  const contract: Contract = { level, strain, doubling, declarer: 'S' };
  return scoreContract(contract, tricks, vulnerability);
}

describe('made contracts, undoubled', () => {
  it('scores part scores', () => {
    expect(score(1, 'NT', 7)).toBe(90);
    expect(score(2, 'S', 9)).toBe(140);
    expect(score(3, 'C', 11)).toBe(150);
    expect(score(2, 'H', 8, 'all')).toBe(110);
  });

  it('scores games', () => {
    expect(score(3, 'NT', 9)).toBe(400);
    expect(score(3, 'NT', 9, 'all')).toBe(600);
    expect(score(4, 'H', 10)).toBe(420);
    expect(score(4, 'H', 10, 'all')).toBe(620);
    expect(score(4, 'S', 11)).toBe(450);
    expect(score(5, 'C', 11)).toBe(400);
    expect(score(5, 'D', 11, 'all')).toBe(600);
  });

  it('scores slams', () => {
    expect(score(6, 'S', 12)).toBe(980);
    expect(score(6, 'S', 12, 'all')).toBe(1430);
    expect(score(6, 'NT', 12)).toBe(990);
    expect(score(6, 'NT', 12, 'all')).toBe(1440);
    expect(score(7, 'NT', 13)).toBe(1520);
    expect(score(7, 'NT', 13, 'all')).toBe(2220);
  });
});

describe('made contracts, doubled and redoubled', () => {
  it('scores doubled contracts', () => {
    expect(score(1, 'NT', 7, 'none', 'doubled')).toBe(180);
    expect(score(1, 'NT', 8, 'none', 'doubled')).toBe(280);
    expect(score(1, 'NT', 8, 'all', 'doubled')).toBe(380);
    expect(score(2, 'H', 8, 'none', 'doubled')).toBe(470);
    expect(score(2, 'H', 8, 'all', 'doubled')).toBe(670);
    expect(score(4, 'S', 11, 'all', 'doubled')).toBe(990);
  });

  it('scores redoubled contracts', () => {
    expect(score(1, 'NT', 7, 'none', 'redoubled')).toBe(560);
    expect(score(1, 'NT', 7, 'all', 'redoubled')).toBe(760);
    expect(score(1, 'C', 8, 'none', 'redoubled')).toBe(430);
  });
});

describe('defeated contracts', () => {
  it('scores undoubled undertricks', () => {
    expect(score(3, 'NT', 8)).toBe(-50);
    expect(score(3, 'NT', 6)).toBe(-150);
    expect(score(3, 'NT', 7, 'all')).toBe(-200);
  });

  it('scores doubled undertricks, not vulnerable', () => {
    expect(score(4, 'S', 9, 'none', 'doubled')).toBe(-100);
    expect(score(4, 'S', 8, 'none', 'doubled')).toBe(-300);
    expect(score(4, 'S', 7, 'none', 'doubled')).toBe(-500);
    expect(score(4, 'S', 6, 'none', 'doubled')).toBe(-800);
    expect(score(4, 'S', 5, 'none', 'doubled')).toBe(-1100);
  });

  it('scores doubled undertricks, vulnerable', () => {
    expect(score(4, 'S', 9, 'all', 'doubled')).toBe(-200);
    expect(score(4, 'S', 8, 'all', 'doubled')).toBe(-500);
    expect(score(4, 'S', 7, 'all', 'doubled')).toBe(-800);
  });

  it('scores redoubled undertricks', () => {
    expect(score(4, 'S', 9, 'none', 'redoubled')).toBe(-200);
    expect(score(4, 'S', 8, 'all', 'redoubled')).toBe(-1000);
  });
});

describe('vulnerability', () => {
  it('uses the vulnerability of the declaring side', () => {
    const northSouth: Contract = { level: 4, strain: 'H', doubling: 'none', declarer: 'N' };
    const eastWest: Contract = { level: 4, strain: 'H', doubling: 'none', declarer: 'E' };
    expect(scoreContract(northSouth, 10, 'NS')).toBe(620);
    expect(scoreContract(northSouth, 10, 'EW')).toBe(420);
    expect(scoreContract(eastWest, 10, 'NS')).toBe(420);
    expect(scoreContract(eastWest, 10, 'EW')).toBe(620);
  });
});
