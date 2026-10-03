import { SEATS, type Seat, type Side } from './seats';

export type Vulnerability = 'none' | 'NS' | 'EW' | 'all';

const VULNERABILITY_CYCLE: readonly Vulnerability[] = [
  'none', 'NS', 'EW', 'all',
  'NS', 'EW', 'all', 'none',
  'EW', 'all', 'none', 'NS',
  'all', 'none', 'NS', 'EW',
];

function assertValidBoard(board: number): void {
  if (!Number.isInteger(board) || board < 1) {
    throw new RangeError(`Invalid board number: ${board}`);
  }
}

export function dealerForBoard(board: number): Seat {
  assertValidBoard(board);
  return SEATS[(board - 1) % 4];
}

export function vulnerabilityForBoard(board: number): Vulnerability {
  assertValidBoard(board);
  return VULNERABILITY_CYCLE[(board - 1) % 16];
}

export function isVulnerable(side: Side, vulnerability: Vulnerability): boolean {
  return vulnerability === 'all' || vulnerability === side;
}
