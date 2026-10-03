import { type Contract, type Doubling, type Level, type Strain } from './auction';
import { type Vulnerability, isVulnerable } from './board';
import { sideOf } from './seats';

const MULTIPLIER: Record<Doubling, number> = { none: 1, doubled: 2, redoubled: 4 };

function isMinor(strain: Strain): boolean {
  return strain === 'C' || strain === 'D';
}

function trickPoints(level: Level, strain: Strain): number {
  if (strain === 'NT') return 40 + 30 * (level - 1);
  return (isMinor(strain) ? 20 : 30) * level;
}

function madeScore(contract: Contract, overtricks: number, vulnerable: boolean): number {
  const { level, strain, doubling } = contract;
  const points = trickPoints(level, strain) * MULTIPLIER[doubling];
  const gameBonus = points >= 100 ? (vulnerable ? 500 : 300) : 50;
  const slamBonus =
    level === 6 ? (vulnerable ? 750 : 500) : level === 7 ? (vulnerable ? 1500 : 1000) : 0;
  const insult = doubling === 'doubled' ? 50 : doubling === 'redoubled' ? 100 : 0;
  const overtrickValue =
    doubling === 'none'
      ? isMinor(strain) ? 20 : 30
      : (vulnerable ? 200 : 100) * (doubling === 'redoubled' ? 2 : 1);
  return points + gameBonus + slamBonus + insult + overtricks * overtrickValue;
}

function penalty(doubling: Doubling, undertricks: number, vulnerable: boolean): number {
  if (doubling === 'none') return undertricks * (vulnerable ? 100 : 50);
  let total = 0;
  for (let n = 1; n <= undertricks; n++) {
    if (vulnerable) total += n === 1 ? 200 : 300;
    else total += n === 1 ? 100 : n <= 3 ? 200 : 300;
  }
  return total * (doubling === 'redoubled' ? 2 : 1);
}

export function scoreContract(
  contract: Contract,
  declarerTricks: number,
  vulnerability: Vulnerability,
): number {
  const vulnerable = isVulnerable(sideOf(contract.declarer), vulnerability);
  const needed = contract.level + 6;
  return declarerTricks >= needed
    ? madeScore(contract, declarerTricks - needed, vulnerable)
    : -penalty(contract.doubling, needed - declarerTricks, vulnerable);
}
