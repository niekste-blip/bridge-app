import { type Card, type Suit, fullDeck, parseCard } from './cards';
import { type Seat } from './seats';

export type Hand = readonly Card[];
export type Deal = Readonly<Record<Seat, Hand>>;
export type Rng = () => number;

// mulberry32: small deterministic generator, so deals can be replayed from a seed
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DISPLAY_SUIT_ORDER: readonly Suit[] = ['S', 'H', 'D', 'C'];

export function sortHand(hand: Hand): Card[] {
  return [...hand].sort(
    (a, b) =>
      DISPLAY_SUIT_ORDER.indexOf(a.suit) - DISPLAY_SUIT_ORDER.indexOf(b.suit) || b.rank - a.rank,
  );
}

export function dealCards(rng: Rng): Deal {
  const deck = fullDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    N: sortHand(deck.slice(0, 13)),
    E: sortHand(deck.slice(13, 26)),
    S: sortHand(deck.slice(26, 39)),
    W: sortHand(deck.slice(39, 52)),
  };
}

export function parseHand(text: string): Hand {
  const holdings = text.split('.');
  if (holdings.length !== 4) {
    throw new Error(`Invalid hand: ${text}`);
  }
  return holdings.flatMap((holding, i) =>
    [...holding].map((rankChar) => parseCard(DISPLAY_SUIT_ORDER[i] + rankChar)),
  );
}

export function suitLength(hand: Hand, suit: Suit): number {
  return hand.filter((card) => card.suit === suit).length;
}

export function highCardPoints(hand: Hand): number {
  return hand.reduce((sum, card) => sum + Math.max(0, card.rank - 10), 0);
}
