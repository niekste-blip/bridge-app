import { type Call, type Card, type Contract, type Seat, type Vulnerability, bid, rankLabel } from '../core';
import { STRAIN_SYMBOL, callLabel } from '../bidding';
import { type Level } from '../bots';
import { type Result, type TextSize } from '../game';

export const SEAT_NAME: Readonly<Record<Seat, string>> = {
  N: 'Noord',
  E: 'Oost',
  S: 'Zuid',
  W: 'West',
};

export const LEVEL_NAME: Readonly<Record<Level, string>> = {
  easy: 'Makkelijk',
  medium: 'Gemiddeld',
  hard: 'Moeilijk',
};

export const TEXT_SIZE_NAME: Readonly<Record<TextSize, string>> = {
  normal: 'Normaal',
  large: 'Groot',
  extraLarge: 'Extra groot',
};

const VULNERABILITY_TEXT: Readonly<Record<Vulnerability, string>> = {
  none: 'Niemand kwetsbaar',
  NS: 'Noord-Zuid kwetsbaar',
  EW: 'Oost-West kwetsbaar',
  all: 'Iedereen kwetsbaar',
};

export function vulnerabilityText(vulnerability: Vulnerability): string {
  return VULNERABILITY_TEXT[vulnerability];
}

export function cardLabel(card: Card): string {
  return `${STRAIN_SYMBOL[card.suit]}${rankLabel(card.rank)}`;
}

// Short form for the table of calls: 'pas', 'X', 'XX', '1♥', '3SA'
export function shortCallLabel(call: Call): string {
  if (call.type === 'pass') return 'pas';
  if (call.type === 'double') return 'X';
  if (call.type === 'redouble') return 'XX';
  return callLabel(call);
}

export function contractText(contract: Contract): string {
  const doubling =
    contract.doubling === 'doubled'
      ? ' gedoubleerd'
      : contract.doubling === 'redoubled'
        ? ' geredoubleerd'
        : '';
  const label = callLabel(bid(contract.level, contract.strain));
  return `${label}${doubling} door ${SEAT_NAME[contract.declarer]}`;
}

export function resultText(result: Result): string {
  const { difference } = result;
  if (difference === 0) return 'Contract precies gemaakt';
  if (difference > 0) {
    return `Contract gemaakt met ${difference} ${difference === 1 ? 'overslag' : 'overslagen'}`;
  }
  return `${-difference} down`;
}

export function scoreText(result: Result): string {
  return result.userScore >= 0
    ? `${result.userScore} punten voor Noord-Zuid`
    : `${-result.userScore} punten voor Oost-West`;
}
