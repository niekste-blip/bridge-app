import { type Call, type Strain, type Suit } from '../core';

export const SUIT_NAME: Readonly<Record<Suit, string>> = {
  C: 'klaveren',
  D: 'ruiten',
  H: 'harten',
  S: 'schoppen',
};

export const STRAIN_SYMBOL: Readonly<Record<Strain, string>> = {
  C: '♣',
  D: '♦',
  H: '♥',
  S: '♠',
  NT: 'SA',
};

export function callLabel(call: Call): string {
  switch (call.type) {
    case 'pass':
      return 'Pas';
    case 'double':
      return 'Doublet';
    case 'redouble':
      return 'Redoublet';
    case 'bid':
      return `${call.level}${STRAIN_SYMBOL[call.strain]}`;
  }
}
