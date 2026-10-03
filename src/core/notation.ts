import {
  type Auction,
  type Call,
  DOUBLE,
  LEVELS,
  type Level,
  PASS,
  REDOUBLE,
  STRAINS,
  type Strain,
  addCall,
  bid,
  newAuction,
} from './auction';
import { type Seat } from './seats';

export function callText(call: Call): string {
  switch (call.type) {
    case 'pass':
      return 'P';
    case 'double':
      return 'X';
    case 'redouble':
      return 'XX';
    case 'bid':
      return `${call.level}${call.strain}`;
  }
}

export function parseCall(text: string): Call {
  if (text === 'P') return PASS;
  if (text === 'X') return DOUBLE;
  if (text === 'XX') return REDOUBLE;
  const level = Number(text[0]) as Level;
  const strain = text.slice(1) as Strain;
  if (!LEVELS.includes(level) || !STRAINS.includes(strain)) {
    throw new Error(`Invalid call: ${text}`);
  }
  return bid(level, strain);
}

export function sameCall(a: Call, b: Call): boolean {
  return callText(a) === callText(b);
}

export function auctionFrom(dealer: Seat, text: string): Auction {
  const words = text.trim() === '' ? [] : text.trim().split(/\s+/);
  return words.map(parseCall).reduce(addCall, newAuction(dealer));
}
