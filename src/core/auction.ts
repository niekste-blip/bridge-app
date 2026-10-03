import { type Seat, seatAfter, sideOf } from './seats';

export const STRAINS = ['C', 'D', 'H', 'S', 'NT'] as const;
export type Strain = (typeof STRAINS)[number];

export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6, 7];

export type Bid = { readonly type: 'bid'; readonly level: Level; readonly strain: Strain };
export type Call =
  | Bid
  | { readonly type: 'pass' }
  | { readonly type: 'double' }
  | { readonly type: 'redouble' };

export const PASS: Call = { type: 'pass' };
export const DOUBLE: Call = { type: 'double' };
export const REDOUBLE: Call = { type: 'redouble' };

export function bid(level: Level, strain: Strain): Bid {
  return { type: 'bid', level, strain };
}

export interface Auction {
  readonly dealer: Seat;
  readonly calls: readonly Call[];
}

export type Doubling = 'none' | 'doubled' | 'redoubled';

export interface Contract {
  readonly level: Level;
  readonly strain: Strain;
  readonly doubling: Doubling;
  readonly declarer: Seat;
}

export function newAuction(dealer: Seat): Auction {
  return { dealer, calls: [] };
}

export function callerAt(auction: Auction, index: number): Seat {
  return seatAfter(auction.dealer, index);
}

export function seatToCall(auction: Auction): Seat {
  return callerAt(auction, auction.calls.length);
}

export function isAuctionComplete(auction: Auction): boolean {
  const { calls } = auction;
  return calls.length >= 4 && calls.slice(-3).every((call) => call.type === 'pass');
}

function bidRank(b: Bid): number {
  return b.level * STRAINS.length + STRAINS.indexOf(b.strain);
}

export function isLegalCall(auction: Auction, call: Call): boolean {
  if (isAuctionComplete(auction)) return false;
  if (call.type === 'pass') return true;

  const { calls } = auction;
  if (call.type === 'bid') {
    const highest = calls.findLast((c): c is Bid => c.type === 'bid');
    return !highest || bidRank(call) > bidRank(highest);
  }

  const lastIndex = calls.findLastIndex((c) => c.type !== 'pass');
  if (lastIndex < 0) return false;
  const byOpponent = sideOf(callerAt(auction, lastIndex)) !== sideOf(seatToCall(auction));
  const needed = call.type === 'double' ? 'bid' : 'double';
  return byOpponent && calls[lastIndex].type === needed;
}

const ALL_CALLS: readonly Call[] = [
  PASS,
  DOUBLE,
  REDOUBLE,
  ...LEVELS.flatMap((level) => STRAINS.map((strain) => bid(level, strain))),
];

export function legalCalls(auction: Auction): Call[] {
  return ALL_CALLS.filter((call) => isLegalCall(auction, call));
}

export function addCall(auction: Auction, call: Call): Auction {
  if (!isLegalCall(auction, call)) {
    throw new Error(`Illegal call: ${JSON.stringify(call)}`);
  }
  return { dealer: auction.dealer, calls: [...auction.calls, call] };
}

export function contractOf(auction: Auction): Contract | null {
  if (!isAuctionComplete(auction)) {
    throw new Error('Auction is not complete');
  }
  const { calls } = auction;
  const finalIndex = calls.findLastIndex((c) => c.type === 'bid');
  if (finalIndex < 0) return null;

  const final = calls[finalIndex] as Bid;
  const after = calls.slice(finalIndex + 1);
  const doubling: Doubling = after.some((c) => c.type === 'redouble')
    ? 'redoubled'
    : after.some((c) => c.type === 'double')
      ? 'doubled'
      : 'none';

  const side = sideOf(callerAt(auction, finalIndex));
  const firstIndex = calls.findIndex(
    (c, i) => c.type === 'bid' && c.strain === final.strain && sideOf(callerAt(auction, i)) === side,
  );
  return {
    level: final.level,
    strain: final.strain,
    doubling,
    declarer: callerAt(auction, firstIndex),
  };
}
