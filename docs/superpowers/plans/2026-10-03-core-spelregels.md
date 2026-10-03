# Core: spelregels en telling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De module `core` bouwen: kaarten, handen, delen, biedverloop met geldigheid, afspelen met geldigheid, en de telling van een contract.

**Architecture:** Pure TypeScript-functies zonder schermcode en zonder afhankelijkheden buiten `src/core`. Alle toestand is onveranderlijk: elke functie die iets wijzigt (`addCall`, `playCard`) geeft een nieuw object terug. Latere modules (`bidding`, `solver`, `bots`, `coach`, `lessons`, `app`) importeren uitsluitend via `src/core/index.ts`.

**Tech Stack:** TypeScript (strict), Vitest, Node 24, npm.

Spec: `docs/superpowers/specs/2026-10-03-bridge-app-design.md`. Dit plan dekt stap 1 van de bouwvolgorde. React, Vite en de PWA komen in het plan voor stap 5.

## Global Constraints

- Werkmap voor alle commando's: de map `bridge-app` (de git-root).
- `src/core` importeert niets van buiten `src/core` en gebruikt geen DOM- of browser-API's.
- Identifiers en foutmeldingen in code zijn Engels. Tekst die de gebruiker ziet is Nederlands; in `core` is dat alleen `rankLabel` (A, H, V, B).
- Kleuren: `'C' | 'D' | 'H' | 'S'` (klaveren, ruiten, harten, schoppen). Speelsoort zonder troef: `'NT'`.
- Rangen zijn getallen 2 tot en met 14 (boer 11, vrouw 12, heer 13, aas 14).
- Notatie in tests: een kaart als `'SA'`, `'HT'`, `'D2'` (kleur + rang uit `23456789TJQKA`); een hand als `'AKQ.JT9.876.5432'` in de volgorde schoppen.harten.ruiten.klaveren.
- Geen `Math.random` in `core`: toeval komt altijd binnen als parameter `Rng`.
- Toestand is onveranderlijk; functies muteren hun argumenten niet.
- Tests staan naast de code als `*.test.ts` en importeren `describe`, `it`, `expect` expliciet uit `vitest`.
- Elke commit eindigt met de regel `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| Bestand | Verantwoordelijkheid |
|---|---|
| `package.json`, `tsconfig.json`, `.gitignore` | Projectopzet |
| `src/core/cards.ts` | `Suit`, `Rank`, `Card`, notatie, het volledige spel kaarten |
| `src/core/seats.ts` | `Seat`, `Side`, volgende speler, partner |
| `src/core/board.ts` | Gever en kwetsbaarheid per spelnummer |
| `src/core/deal.ts` | `Hand`, `Deal`, toevalsgenerator, delen, hand inlezen, punten tellen |
| `src/core/auction.ts` | `Call`, `Auction`, geldigheid van biedingen, eindcontract |
| `src/core/play.ts` | `PlayState`, geldige kaarten, slagwinnaar, een kaart spelen |
| `src/core/scoring.ts` | Telling van een contract |
| `src/core/index.ts` | Publieke export van de module |
| `src/core/game.test.ts` | Integratietest: een compleet spel van delen tot telling |

---

### Task 1: Projectopzet en kaarten

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`
- Create: `src/core/cards.ts`
- Test: `src/core/cards.test.ts`

**Interfaces:**
- Consumes: niets
- Produces:
  - `SUITS: readonly ['C','D','H','S']`, `type Suit`
  - `RANKS: readonly [2..14]`, `type Rank`
  - `interface Card { readonly suit: Suit; readonly rank: Rank }`
  - `parseCard(text: string): Card`
  - `cardId(card: Card): string`
  - `sameCard(a: Card, b: Card): boolean`
  - `fullDeck(): Card[]`
  - `rankLabel(rank: Rank): string`

- [ ] **Step 1: Project aanmaken**

```bash
npm init -y
npm pkg set type=module scripts.test="vitest run" scripts.typecheck="tsc --noEmit"
npm pkg delete main
npm install -D typescript vitest
```

Maak `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Maak `.gitignore`:

```
node_modules
dist
.DS_Store
```

- [ ] **Step 2: Schrijf de falende test**

`src/core/cards.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cardId, fullDeck, parseCard, rankLabel, sameCard } from './cards';

describe('parseCard', () => {
  it('reads suit and rank', () => {
    expect(parseCard('SA')).toEqual({ suit: 'S', rank: 14 });
    expect(parseCard('HT')).toEqual({ suit: 'H', rank: 10 });
    expect(parseCard('D2')).toEqual({ suit: 'D', rank: 2 });
  });

  it('rejects invalid text', () => {
    expect(() => parseCard('X2')).toThrow();
    expect(() => parseCard('S1')).toThrow();
    expect(() => parseCard('SAA')).toThrow();
    expect(() => parseCard('S')).toThrow();
  });
});

describe('fullDeck', () => {
  it('has 52 different cards', () => {
    const ids = fullDeck().map(cardId);
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
  });

  it('round-trips through cardId and parseCard', () => {
    for (const card of fullDeck()) {
      expect(parseCard(cardId(card))).toEqual(card);
    }
  });
});

describe('sameCard', () => {
  it('compares suit and rank', () => {
    expect(sameCard(parseCard('SA'), parseCard('SA'))).toBe(true);
    expect(sameCard(parseCard('SA'), parseCard('HA'))).toBe(false);
    expect(sameCard(parseCard('SA'), parseCard('SK'))).toBe(false);
  });
});

describe('rankLabel', () => {
  it('uses Dutch letters for honours', () => {
    expect(rankLabel(14)).toBe('A');
    expect(rankLabel(13)).toBe('H');
    expect(rankLabel(12)).toBe('V');
    expect(rankLabel(11)).toBe('B');
    expect(rankLabel(10)).toBe('10');
    expect(rankLabel(2)).toBe('2');
  });
});
```

- [ ] **Step 3: Draai de test en zie hem falen**

Run: `npm test -- src/core/cards.test.ts`
Expected: FAIL, `./cards` kan niet worden gevonden.

- [ ] **Step 4: Schrijf de implementatie**

`src/core/cards.ts`:

```ts
export const SUITS = ['C', 'D', 'H', 'S'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

const RANK_CHARS = '23456789TJQKA';

export function parseCard(text: string): Card {
  const suit = text[0] as Suit;
  const rankIndex = text.length === 2 ? RANK_CHARS.indexOf(text[1]) : -1;
  if (!SUITS.includes(suit) || rankIndex < 0) {
    throw new Error(`Invalid card: ${text}`);
  }
  return { suit, rank: RANKS[rankIndex] };
}

export function cardId(card: Card): string {
  return card.suit + RANK_CHARS[card.rank - 2];
}

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function fullDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
}

const HONOUR_LABELS: Partial<Record<Rank, string>> = { 11: 'B', 12: 'V', 13: 'H', 14: 'A' };

export function rankLabel(rank: Rank): string {
  return HONOUR_LABELS[rank] ?? String(rank);
}
```

- [ ] **Step 5: Draai de test en de typecontrole**

Run: `npm test -- src/core/cards.test.ts && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore src/core/cards.ts src/core/cards.test.ts
git commit -m "Add project setup and card types"
```

---

### Task 2: Plaatsen aan tafel, gever en kwetsbaarheid

**Files:**
- Create: `src/core/seats.ts`, `src/core/board.ts`
- Test: `src/core/seats.test.ts`, `src/core/board.test.ts`

**Interfaces:**
- Consumes: niets
- Produces:
  - `SEATS: readonly ['N','E','S','W']`, `type Seat`, `type Side = 'NS' | 'EW'`
  - `seatAfter(seat: Seat, steps?: number): Seat` (standaard 1 stap, met de klok mee)
  - `partnerOf(seat: Seat): Seat`
  - `sideOf(seat: Seat): Side`
  - `type Vulnerability = 'none' | 'NS' | 'EW' | 'all'`
  - `dealerForBoard(board: number): Seat` (spelnummers beginnen bij 1)
  - `vulnerabilityForBoard(board: number): Vulnerability`
  - `isVulnerable(side: Side, vulnerability: Vulnerability): boolean`

- [ ] **Step 1: Schrijf de falende tests**

`src/core/seats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { partnerOf, seatAfter, sideOf } from './seats';

describe('seats', () => {
  it('moves clockwise', () => {
    expect(seatAfter('N')).toBe('E');
    expect(seatAfter('W')).toBe('N');
    expect(seatAfter('S', 3)).toBe('E');
    expect(seatAfter('E', 0)).toBe('E');
  });

  it('finds the partner', () => {
    expect(partnerOf('N')).toBe('S');
    expect(partnerOf('W')).toBe('E');
  });

  it('knows the sides', () => {
    expect(sideOf('N')).toBe('NS');
    expect(sideOf('S')).toBe('NS');
    expect(sideOf('E')).toBe('EW');
    expect(sideOf('W')).toBe('EW');
  });
});
```

`src/core/board.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dealerForBoard, isVulnerable, vulnerabilityForBoard } from './board';

describe('dealerForBoard', () => {
  it('rotates every board', () => {
    expect([1, 2, 3, 4, 5, 17].map(dealerForBoard)).toEqual(['N', 'E', 'S', 'W', 'N', 'N']);
  });
});

describe('vulnerabilityForBoard', () => {
  it('follows the standard 16-board cycle', () => {
    const boards = Array.from({ length: 16 }, (_, i) => vulnerabilityForBoard(i + 1));
    expect(boards).toEqual([
      'none', 'NS', 'EW', 'all',
      'NS', 'EW', 'all', 'none',
      'EW', 'all', 'none', 'NS',
      'all', 'none', 'NS', 'EW',
    ]);
  });

  it('repeats after 16 boards', () => {
    expect(vulnerabilityForBoard(17)).toBe('none');
    expect(vulnerabilityForBoard(20)).toBe('all');
  });
});

describe('isVulnerable', () => {
  it('checks one side', () => {
    expect(isVulnerable('NS', 'none')).toBe(false);
    expect(isVulnerable('NS', 'NS')).toBe(true);
    expect(isVulnerable('EW', 'NS')).toBe(false);
    expect(isVulnerable('EW', 'all')).toBe(true);
  });
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npm test -- src/core/seats.test.ts src/core/board.test.ts`
Expected: FAIL, `./seats` en `./board` kunnen niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/core/seats.ts`:

```ts
export const SEATS = ['N', 'E', 'S', 'W'] as const;
export type Seat = (typeof SEATS)[number];
export type Side = 'NS' | 'EW';

export function seatAfter(seat: Seat, steps = 1): Seat {
  return SEATS[(SEATS.indexOf(seat) + steps) % 4];
}

export function partnerOf(seat: Seat): Seat {
  return seatAfter(seat, 2);
}

export function sideOf(seat: Seat): Side {
  return seat === 'N' || seat === 'S' ? 'NS' : 'EW';
}
```

`src/core/board.ts`:

```ts
import { SEATS, type Seat, type Side } from './seats';

export type Vulnerability = 'none' | 'NS' | 'EW' | 'all';

const VULNERABILITY_CYCLE: readonly Vulnerability[] = [
  'none', 'NS', 'EW', 'all',
  'NS', 'EW', 'all', 'none',
  'EW', 'all', 'none', 'NS',
  'all', 'none', 'NS', 'EW',
];

export function dealerForBoard(board: number): Seat {
  return SEATS[(board - 1) % 4];
}

export function vulnerabilityForBoard(board: number): Vulnerability {
  return VULNERABILITY_CYCLE[(board - 1) % 16];
}

export function isVulnerable(side: Side, vulnerability: Vulnerability): boolean {
  return vulnerability === 'all' || vulnerability === side;
}
```

- [ ] **Step 4: Draai de tests en de typecontrole**

Run: `npm test -- src/core/seats.test.ts src/core/board.test.ts && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/core/seats.ts src/core/seats.test.ts src/core/board.ts src/core/board.test.ts
git commit -m "Add seats, dealer and vulnerability"
```

---

### Task 3: Handen en delen

**Files:**
- Create: `src/core/deal.ts`
- Test: `src/core/deal.test.ts`

**Interfaces:**
- Consumes:
  - uit `./cards`: `Card`, `Suit`, `fullDeck(): Card[]`, `parseCard(text: string): Card`
  - uit `./seats`: `Seat`
- Produces:
  - `type Hand = readonly Card[]`
  - `type Deal = Readonly<Record<Seat, Hand>>`
  - `type Rng = () => number` (geeft een getal in `[0, 1)`)
  - `seededRng(seed: number): Rng`
  - `dealCards(rng: Rng): Deal` (vier gesorteerde handen van 13 kaarten)
  - `sortHand(hand: Hand): Card[]` (schoppen, harten, ruiten, klaveren; binnen een kleur van hoog naar laag)
  - `parseHand(text: string): Hand`
  - `suitLength(hand: Hand, suit: Suit): number`
  - `highCardPoints(hand: Hand): number` (aas 4, heer 3, vrouw 2, boer 1)

- [ ] **Step 1: Schrijf de falende test**

`src/core/deal.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cardId } from './cards';
import { dealCards, highCardPoints, parseHand, seededRng, sortHand, suitLength } from './deal';
import { SEATS } from './seats';

describe('parseHand', () => {
  it('reads spades.hearts.diamonds.clubs', () => {
    const hand = parseHand('AKQ.JT9.876.5432');
    expect(hand).toHaveLength(13);
    expect(hand.map(cardId)).toEqual([
      'SA', 'SK', 'SQ', 'HJ', 'HT', 'H9', 'D8', 'D7', 'D6', 'C5', 'C4', 'C3', 'C2',
    ]);
  });

  it('accepts a void suit', () => {
    const hand = parseHand('AKQJT98765432...');
    expect(hand).toHaveLength(13);
    expect(suitLength(hand, 'S')).toBe(13);
    expect(suitLength(hand, 'H')).toBe(0);
  });

  it('rejects text without four suits', () => {
    expect(() => parseHand('AKQ.JT9.876')).toThrow();
  });
});

describe('highCardPoints', () => {
  it('counts ace 4, king 3, queen 2, jack 1', () => {
    expect(highCardPoints(parseHand('AKQ.JT9.876.5432'))).toBe(10);
    expect(highCardPoints(parseHand('AKQJ.AKQ.AKQ.AKQ'))).toBe(37);
    expect(highCardPoints(parseHand('T98.765.432.9876'))).toBe(0);
  });
});

describe('suitLength', () => {
  it('counts the cards in one suit', () => {
    const hand = parseHand('AKQ.JT9.876.5432');
    expect(suitLength(hand, 'S')).toBe(3);
    expect(suitLength(hand, 'C')).toBe(4);
  });
});

describe('dealCards', () => {
  it('gives every seat 13 cards and uses the whole deck', () => {
    const deal = dealCards(seededRng(1));
    const ids = SEATS.flatMap((seat) => deal[seat].map(cardId));
    for (const seat of SEATS) expect(deal[seat]).toHaveLength(13);
    expect(new Set(ids).size).toBe(52);
  });

  it('deals 40 high card points in total', () => {
    const deal = dealCards(seededRng(7));
    const total = SEATS.reduce((sum, seat) => sum + highCardPoints(deal[seat]), 0);
    expect(total).toBe(40);
  });

  it('gives the same deal for the same seed', () => {
    expect(dealCards(seededRng(123))).toEqual(dealCards(seededRng(123)));
  });

  it('gives different deals for different seeds', () => {
    expect(dealCards(seededRng(1))).not.toEqual(dealCards(seededRng(2)));
  });

  it('returns sorted hands', () => {
    const deal = dealCards(seededRng(5));
    for (const seat of SEATS) expect(deal[seat]).toEqual(sortHand(deal[seat]));
  });
});

describe('sortHand', () => {
  it('orders spades, hearts, diamonds, clubs and high to low', () => {
    const shuffled = [...parseHand('A2.K3.Q4.J5')].reverse();
    expect(sortHand(shuffled).map(cardId)).toEqual(['SA', 'S2', 'HK', 'H3', 'DQ', 'D4', 'CJ', 'C5']);
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/core/deal.test.ts`
Expected: FAIL, `./deal` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/core/deal.ts`:

```ts
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
```

- [ ] **Step 4: Draai de test en de typecontrole**

Run: `npm test -- src/core/deal.test.ts && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/core/deal.ts src/core/deal.test.ts
git commit -m "Add hands, dealing and high card points"
```

---

### Task 4: Het biedverloop

**Files:**
- Create: `src/core/auction.ts`
- Test: `src/core/auction.test.ts`

**Interfaces:**
- Consumes:
  - uit `./seats`: `Seat`, `seatAfter(seat, steps?)`, `sideOf(seat)`
- Produces:
  - `STRAINS: readonly ['C','D','H','S','NT']`, `type Strain`
  - `LEVELS: readonly Level[]`, `type Level = 1|2|3|4|5|6|7`
  - `type Bid = { readonly type: 'bid'; readonly level: Level; readonly strain: Strain }`
  - `type Call = Bid | { readonly type: 'pass' } | { readonly type: 'double' } | { readonly type: 'redouble' }`
  - `PASS`, `DOUBLE`, `REDOUBLE` (constanten van type `Call`), `bid(level: Level, strain: Strain): Bid`
  - `interface Auction { readonly dealer: Seat; readonly calls: readonly Call[] }`
  - `type Doubling = 'none' | 'doubled' | 'redoubled'`
  - `interface Contract { readonly level: Level; readonly strain: Strain; readonly doubling: Doubling; readonly declarer: Seat }`
  - `newAuction(dealer: Seat): Auction`
  - `callerAt(auction: Auction, index: number): Seat`
  - `seatToCall(auction: Auction): Seat`
  - `isAuctionComplete(auction: Auction): boolean`
  - `isLegalCall(auction: Auction, call: Call): boolean`
  - `legalCalls(auction: Auction): Call[]`
  - `addCall(auction: Auction, call: Call): Auction` (gooit een fout bij een ongeldig bod)
  - `contractOf(auction: Auction): Contract | null` (`null` bij rondpas; gooit een fout als het bieden nog loopt)

Regels:
- Het bieden is afgelopen na vier keer pas vanaf het begin, of na drie keer pas volgend op minstens één ander bod.
- Een bod moet hoger zijn dan het laatste bod: hoger niveau, of gelijk niveau en een hogere speelsoort in de volgorde klaveren, ruiten, harten, schoppen, SA.
- Doublet mag alleen als het laatste bod dat geen pas is een bod van de tegenpartij is.
- Redoublet mag alleen als het laatste bod dat geen pas is een doublet van de tegenpartij is.
- De leider is de speler van de partij die het eindbod deed, die de speelsoort van het eindcontract als eerste bood.

- [ ] **Step 1: Schrijf de falende test**

`src/core/auction.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  type Auction,
  type Call,
  DOUBLE,
  PASS,
  REDOUBLE,
  addCall,
  bid,
  contractOf,
  isAuctionComplete,
  isLegalCall,
  legalCalls,
  newAuction,
  seatToCall,
} from './auction';
import { type Seat } from './seats';

function auctionOf(dealer: Seat, ...calls: Call[]): Auction {
  return calls.reduce(addCall, newAuction(dealer));
}

describe('seatToCall', () => {
  it('starts with the dealer and moves clockwise', () => {
    expect(seatToCall(newAuction('S'))).toBe('S');
    expect(seatToCall(auctionOf('S', PASS))).toBe('W');
    expect(seatToCall(auctionOf('S', PASS, PASS, PASS))).toBe('E');
  });
});

describe('bids', () => {
  it('allows pass and all 35 bids at the start, but no double', () => {
    const calls = legalCalls(newAuction('N'));
    expect(calls).toHaveLength(36);
    expect(calls).toContainEqual(PASS);
    expect(calls).not.toContainEqual(DOUBLE);
    expect(calls).not.toContainEqual(REDOUBLE);
  });

  it('requires a bid higher than the last bid', () => {
    const auction = auctionOf('N', bid(1, 'H'));
    expect(isLegalCall(auction, bid(1, 'C'))).toBe(false);
    expect(isLegalCall(auction, bid(1, 'D'))).toBe(false);
    expect(isLegalCall(auction, bid(1, 'H'))).toBe(false);
    expect(isLegalCall(auction, bid(1, 'S'))).toBe(true);
    expect(isLegalCall(auction, bid(1, 'NT'))).toBe(true);
    expect(isLegalCall(auction, bid(2, 'C'))).toBe(true);
  });

  it('leaves only pass and double above 7NT', () => {
    expect(legalCalls(auctionOf('N', bid(7, 'NT')))).toEqual([PASS, DOUBLE]);
  });
});

describe('double', () => {
  it('is allowed on an opponent bid', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H')), DOUBLE)).toBe(true);
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), PASS, PASS), DOUBLE)).toBe(true);
  });

  it('is not allowed on a partner bid', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), PASS), DOUBLE)).toBe(false);
  });

  it('is not allowed twice', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, PASS, PASS), DOUBLE)).toBe(false);
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, PASS), DOUBLE)).toBe(false);
  });
});

describe('redouble', () => {
  it('is allowed on an opponent double', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE), REDOUBLE)).toBe(true);
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, PASS, PASS), REDOUBLE)).toBe(true);
  });

  it('is not allowed on a partner double or without a double', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, PASS), REDOUBLE)).toBe(false);
    expect(isLegalCall(auctionOf('N', bid(1, 'H')), REDOUBLE)).toBe(false);
  });

  it('blocks a further double', () => {
    expect(isLegalCall(auctionOf('N', bid(1, 'H'), DOUBLE, REDOUBLE), DOUBLE)).toBe(false);
  });
});

describe('isAuctionComplete', () => {
  it('ends after four passes', () => {
    expect(isAuctionComplete(auctionOf('N', PASS, PASS, PASS))).toBe(false);
    expect(isAuctionComplete(auctionOf('N', PASS, PASS, PASS, PASS))).toBe(true);
  });

  it('ends after three passes following a bid', () => {
    expect(isAuctionComplete(auctionOf('N', PASS, PASS, PASS, bid(1, 'H')))).toBe(false);
    expect(isAuctionComplete(auctionOf('N', bid(1, 'NT'), PASS, PASS))).toBe(false);
    expect(isAuctionComplete(auctionOf('N', bid(1, 'NT'), PASS, PASS, PASS))).toBe(true);
  });

  it('allows no calls after the end', () => {
    const auction = auctionOf('N', bid(1, 'NT'), PASS, PASS, PASS);
    expect(legalCalls(auction)).toEqual([]);
    expect(() => addCall(auction, PASS)).toThrow();
  });
});

describe('addCall', () => {
  it('rejects an illegal call', () => {
    expect(() => addCall(auctionOf('N', bid(2, 'H')), bid(1, 'S'))).toThrow();
    expect(() => addCall(newAuction('N'), DOUBLE)).toThrow();
  });

  it('does not change the original auction', () => {
    const auction = newAuction('N');
    addCall(auction, PASS);
    expect(auction.calls).toHaveLength(0);
  });
});

describe('contractOf', () => {
  it('returns null when everyone passes', () => {
    expect(contractOf(auctionOf('N', PASS, PASS, PASS, PASS))).toBeNull();
  });

  it('throws while the auction is still running', () => {
    expect(() => contractOf(auctionOf('N', bid(1, 'H')))).toThrow();
  });

  it('gives the final bid and the declarer', () => {
    expect(contractOf(auctionOf('E', bid(1, 'NT'), PASS, PASS, PASS))).toEqual({
      level: 1,
      strain: 'NT',
      doubling: 'none',
      declarer: 'E',
    });
  });

  it('makes the first player of the side to name the strain declarer', () => {
    // N: 1C, S: 1H, N: 2H, S: 4H -> South named hearts first
    const auction = auctionOf(
      'N',
      bid(1, 'C'), PASS, bid(1, 'H'), PASS,
      bid(2, 'H'), PASS, bid(4, 'H'), PASS,
      PASS, PASS,
    );
    expect(contractOf(auction)).toEqual({ level: 4, strain: 'H', doubling: 'none', declarer: 'S' });
  });

  it('ignores an opponent who named the strain earlier', () => {
    // E bids spades first, but N-S end up in spades: North is declarer
    const auction = auctionOf('E', bid(1, 'S'), PASS, PASS, bid(2, 'S'), PASS, PASS, PASS);
    expect(contractOf(auction)?.declarer).toBe('N');
  });

  it('records doubles and redoubles on the final bid only', () => {
    expect(contractOf(auctionOf('N', bid(1, 'H'), DOUBLE, PASS, PASS, PASS))?.doubling).toBe('doubled');
    expect(
      contractOf(auctionOf('N', bid(1, 'H'), DOUBLE, REDOUBLE, PASS, PASS, PASS))?.doubling,
    ).toBe('redoubled');
    expect(
      contractOf(auctionOf('N', bid(1, 'H'), DOUBLE, bid(2, 'H'), PASS, PASS, PASS))?.doubling,
    ).toBe('none');
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/core/auction.test.ts`
Expected: FAIL, `./auction` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/core/auction.ts`:

```ts
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
```

- [ ] **Step 4: Draai de test en de typecontrole**

Run: `npm test -- src/core/auction.test.ts && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/core/auction.ts src/core/auction.test.ts
git commit -m "Add auction with call legality and final contract"
```

---

### Task 5: Het afspelen

**Files:**
- Create: `src/core/play.ts`
- Test: `src/core/play.test.ts`

**Interfaces:**
- Consumes:
  - uit `./cards`: `Card`, `cardId(card)`, `sameCard(a, b)`, `parseCard(text)` (alleen in de test)
  - uit `./auction`: `Strain`, `Contract { level; strain; doubling; declarer }`
  - uit `./deal`: `Deal`
  - uit `./seats`: `SEATS`, `Seat`, `Side`, `seatAfter(seat, steps?)`, `partnerOf(seat)`, `sideOf(seat)`
- Produces:
  - `interface Trick { readonly leader: Seat; readonly cards: readonly Card[] }`
  - `interface CompletedTrick extends Trick { readonly winner: Seat }`
  - `interface PlayState { readonly trump: Strain; readonly declarer: Seat; readonly hands: Deal; readonly completed: readonly CompletedTrick[]; readonly current: Trick }`
  - `startPlay(deal: Deal, contract: Contract): PlayState`
  - `dummyOf(state: PlayState): Seat`
  - `seatToPlay(state: PlayState): Seat`
  - `legalCards(state: PlayState): Card[]`
  - `trickWinner(trick: Trick, trump: Strain): Seat`
  - `playCard(state: PlayState, card: Card): PlayState` (gooit een fout bij een ongeldige kaart)
  - `isPlayComplete(state: PlayState): boolean`
  - `tricksWon(state: PlayState, side: Side): number`

Regels:
- De speler links van de leider komt uit.
- Kleur bekennen is verplicht. Wie niet kan bekennen, mag elke kaart spelen.
- De hoogste troef wint de slag. Is er geen troef gespeeld, dan wint de hoogste kaart in de uitgekomen kleur.
- De winnaar van een slag komt uit voor de volgende.
- Het spel is afgelopen als alle handen leeg zijn. Daardoor werken tests ook met handen van minder dan 13 kaarten.

- [ ] **Step 1: Schrijf de falende test**

`src/core/play.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type Contract, type Strain } from './auction';
import { cardId, parseCard } from './cards';
import { type Deal } from './deal';
import {
  dummyOf,
  isPlayComplete,
  legalCards,
  playCard,
  seatToPlay,
  startPlay,
  trickWinner,
  tricksWon,
} from './play';

const cards = (...ids: string[]) => ids.map(parseCard);

// Two cards each; West has no hearts
const deal: Deal = {
  N: cards('SA', 'H2'),
  E: cards('SK', 'H3'),
  S: cards('S2', 'HA'),
  W: cards('S3', 'D2'),
};

function contract(strain: Strain): Contract {
  return { level: 1, strain, doubling: 'none', declarer: 'S' };
}

function playAll(strain: Strain, ...ids: string[]) {
  return ids.reduce((state, id) => playCard(state, parseCard(id)), startPlay(deal, contract(strain)));
}

describe('startPlay', () => {
  it('lets the player left of declarer lead', () => {
    const state = startPlay(deal, contract('NT'));
    expect(seatToPlay(state)).toBe('W');
    expect(dummyOf(state)).toBe('N');
    expect(isPlayComplete(state)).toBe(false);
  });
});

describe('legalCards', () => {
  it('allows any card on lead', () => {
    const state = startPlay(deal, contract('NT'));
    expect(legalCards(state).map(cardId)).toEqual(['S3', 'D2']);
  });

  it('requires following suit', () => {
    const state = playAll('NT', 'S3');
    expect(seatToPlay(state)).toBe('N');
    expect(legalCards(state).map(cardId)).toEqual(['SA']);
  });

  it('allows any card when unable to follow', () => {
    const state = playAll('NT', 'S3', 'SA', 'SK', 'S2', 'H2', 'H3', 'HA');
    expect(seatToPlay(state)).toBe('W');
    expect(legalCards(state).map(cardId)).toEqual(['D2']);
  });
});

describe('playCard', () => {
  it('rejects a card that does not follow suit', () => {
    const state = playAll('NT', 'S3');
    expect(() => playCard(state, parseCard('H2'))).toThrow();
  });

  it('rejects a card that is not in the hand', () => {
    const state = startPlay(deal, contract('NT'));
    expect(() => playCard(state, parseCard('SA'))).toThrow();
  });

  it('does not change the original state', () => {
    const state = startPlay(deal, contract('NT'));
    playCard(state, parseCard('S3'));
    expect(state.hands.W).toHaveLength(2);
    expect(state.current.cards).toHaveLength(0);
  });

  it('gives the lead to the winner of the trick', () => {
    const state = playAll('NT', 'S3', 'SA', 'SK', 'S2');
    expect(state.completed).toHaveLength(1);
    expect(state.completed[0].winner).toBe('N');
    expect(seatToPlay(state)).toBe('N');
    expect(tricksWon(state, 'NS')).toBe(1);
    expect(tricksWon(state, 'EW')).toBe(0);
  });

  it('plays a whole deal in no trump', () => {
    const state = playAll('NT', 'S3', 'SA', 'SK', 'S2', 'H2', 'H3', 'HA', 'D2');
    expect(isPlayComplete(state)).toBe(true);
    expect(tricksWon(state, 'NS')).toBe(2);
    expect(tricksWon(state, 'EW')).toBe(0);
    expect(legalCards(state)).toEqual([]);
  });

  it('lets a trump win the trick', () => {
    const state = playAll('D', 'S3', 'SA', 'SK', 'S2', 'H2', 'H3', 'HA', 'D2');
    expect(state.completed[1].winner).toBe('W');
    expect(tricksWon(state, 'NS')).toBe(1);
    expect(tricksWon(state, 'EW')).toBe(1);
  });
});

describe('trickWinner', () => {
  const trick = { leader: 'N' as const, cards: cards('H2', 'SA', 'H3', 'H4') };

  it('ignores a discard in no trump', () => {
    expect(trickWinner(trick, 'NT')).toBe('W');
  });

  it('lets the highest trump win', () => {
    expect(trickWinner(trick, 'S')).toBe('E');
    expect(trickWinner({ leader: 'E', cards: cards('H2', 'S3', 'S9', 'HA') }, 'S')).toBe('W');
  });

  it('lets the highest card of the suit led win when trumps are led', () => {
    expect(trickWinner({ leader: 'S', cards: cards('S5', 'SQ', 'S6', 'HA') }, 'S')).toBe('W');
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/core/play.test.ts`
Expected: FAIL, `./play` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/core/play.ts`:

```ts
import { type Contract, type Strain } from './auction';
import { type Card, cardId, sameCard } from './cards';
import { type Deal } from './deal';
import { SEATS, type Seat, type Side, partnerOf, seatAfter, sideOf } from './seats';

export interface Trick {
  readonly leader: Seat;
  readonly cards: readonly Card[];
}

export interface CompletedTrick extends Trick {
  readonly winner: Seat;
}

export interface PlayState {
  readonly trump: Strain;
  readonly declarer: Seat;
  readonly hands: Deal;
  readonly completed: readonly CompletedTrick[];
  readonly current: Trick;
}

export function startPlay(deal: Deal, contract: Contract): PlayState {
  return {
    trump: contract.strain,
    declarer: contract.declarer,
    hands: deal,
    completed: [],
    current: { leader: seatAfter(contract.declarer), cards: [] },
  };
}

export function dummyOf(state: PlayState): Seat {
  return partnerOf(state.declarer);
}

export function seatToPlay(state: PlayState): Seat {
  return seatAfter(state.current.leader, state.current.cards.length);
}

export function isPlayComplete(state: PlayState): boolean {
  return SEATS.every((seat) => state.hands[seat].length === 0);
}

export function legalCards(state: PlayState): Card[] {
  const hand = state.hands[seatToPlay(state)];
  if (state.current.cards.length === 0) return [...hand];
  const ledSuit = state.current.cards[0].suit;
  const following = hand.filter((card) => card.suit === ledSuit);
  return following.length > 0 ? following : [...hand];
}

export function trickWinner(trick: Trick, trump: Strain): Seat {
  const ledSuit = trick.cards[0].suit;
  const strength = (card: Card) =>
    card.suit === trump ? 100 + card.rank : card.suit === ledSuit ? card.rank : 0;
  let best = 0;
  trick.cards.forEach((card, i) => {
    if (strength(card) > strength(trick.cards[best])) best = i;
  });
  return seatAfter(trick.leader, best);
}

export function playCard(state: PlayState, card: Card): PlayState {
  if (!legalCards(state).some((legal) => sameCard(legal, card))) {
    throw new Error(`Illegal card: ${cardId(card)}`);
  }
  const seat = seatToPlay(state);
  const hands: Deal = {
    ...state.hands,
    [seat]: state.hands[seat].filter((held) => !sameCard(held, card)),
  };
  const trick: Trick = {
    leader: state.current.leader,
    cards: [...state.current.cards, card],
  };
  if (trick.cards.length < 4) {
    return { ...state, hands, current: trick };
  }
  const winner = trickWinner(trick, state.trump);
  return {
    ...state,
    hands,
    completed: [...state.completed, { ...trick, winner }],
    current: { leader: winner, cards: [] },
  };
}

export function tricksWon(state: PlayState, side: Side): number {
  return state.completed.filter((trick) => sideOf(trick.winner) === side).length;
}
```

- [ ] **Step 4: Draai de test en de typecontrole**

Run: `npm test -- src/core/play.test.ts && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/core/play.ts src/core/play.test.ts
git commit -m "Add card play with legality and trick winners"
```

---

### Task 6: De telling

**Files:**
- Create: `src/core/scoring.ts`
- Test: `src/core/scoring.test.ts`

**Interfaces:**
- Consumes:
  - uit `./auction`: `Contract { level; strain; doubling; declarer }`, `Doubling`, `Level`, `Strain`
  - uit `./board`: `Vulnerability`, `isVulnerable(side, vulnerability)`
  - uit `./seats`: `sideOf(seat)`
- Produces:
  - `scoreContract(contract: Contract, declarerTricks: number, vulnerability: Vulnerability): number`
    Score vanuit de partij van de leider: positief als het contract gemaakt is, negatief als het down gaat. `declarerTricks` is het aantal slagen (0 tot en met 13) van de partij van de leider.

Regels (officiële telling voor wedstrijdbridge):

| Onderdeel | Waarde |
|---|---|
| Slagpunten per geboden slag | klaveren/ruiten 20; harten/schoppen 30; SA 40 voor de eerste, 30 voor elke volgende. Gedoubleerd ×2, geredoubleerd ×4 |
| Deelscore (slagpunten onder 100) | 50 |
| Manche (slagpunten 100 of meer) | 300 niet kwetsbaar, 500 kwetsbaar |
| Klein slem (niveau 6) | 500 niet kwetsbaar, 750 kwetsbaar, boven op de manchepremie |
| Groot slem (niveau 7) | 1000 niet kwetsbaar, 1500 kwetsbaar, boven op de manchepremie |
| Premie voor een gemaakt gedoubleerd contract | 50; geredoubleerd 100 |
| Overslag ongedoubleerd | klaveren/ruiten 20; harten/schoppen/SA 30 |
| Overslag gedoubleerd | 100 niet kwetsbaar, 200 kwetsbaar; geredoubleerd het dubbele |
| Down ongedoubleerd, per slag | 50 niet kwetsbaar, 100 kwetsbaar |
| Down gedoubleerd, niet kwetsbaar | eerste 100, tweede en derde elk 200, daarna elk 300 |
| Down gedoubleerd, kwetsbaar | eerste 200, daarna elk 300 |
| Down geredoubleerd | het dubbele van gedoubleerd |

- [ ] **Step 1: Schrijf de falende test**

`src/core/scoring.test.ts`:

```ts
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
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/core/scoring.test.ts`
Expected: FAIL, `./scoring` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/core/scoring.ts`:

```ts
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
```

- [ ] **Step 4: Draai de test en de typecontrole**

Run: `npm test -- src/core/scoring.test.ts && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/core/scoring.ts src/core/scoring.test.ts
git commit -m "Add contract scoring"
```

---

### Task 7: Publieke export en een compleet spel

**Files:**
- Create: `src/core/index.ts`
- Test: `src/core/game.test.ts`

**Interfaces:**
- Consumes (alles via `./index`):
  - `seededRng(seed)`, `dealCards(rng)`, `Deal`
  - `dealerForBoard(board)`, `vulnerabilityForBoard(board)`
  - `newAuction(dealer)`, `addCall(auction, call)`, `bid(level, strain)`, `PASS`, `contractOf(auction)`
  - `startPlay(deal, contract)`, `legalCards(state)`, `playCard(state, card)`, `isPlayComplete(state)`, `tricksWon(state, side)`, `seatToPlay(state)`
  - `scoreContract(contract, declarerTricks, vulnerability)`
  - `sideOf(seat)`, `SEATS`
- Produces:
  - `src/core/index.ts`: het enige importpunt voor latere modules. Exporteert alles uit `cards`, `seats`, `board`, `deal`, `auction`, `play` en `scoring`.

- [ ] **Step 1: Schrijf de falende test**

`src/core/game.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  PASS,
  SEATS,
  addCall,
  bid,
  contractOf,
  dealCards,
  dealerForBoard,
  isPlayComplete,
  legalCards,
  newAuction,
  playCard,
  scoreContract,
  seatToPlay,
  seededRng,
  sideOf,
  startPlay,
  tricksWon,
  vulnerabilityForBoard,
} from './index';

function playWholeBoard(board: number, seed: number) {
  const deal = dealCards(seededRng(seed));
  const calls = [bid(1, 'NT'), PASS, PASS, PASS];
  const auction = calls.reduce(addCall, newAuction(dealerForBoard(board)));
  const contract = contractOf(auction);
  if (!contract) throw new Error('Expected a contract');

  let state = startPlay(deal, contract);
  let cardsPlayed = 0;
  while (!isPlayComplete(state)) {
    state = playCard(state, legalCards(state)[0]);
    cardsPlayed++;
  }
  const declarerSide = sideOf(contract.declarer);
  const declarerTricks = tricksWon(state, declarerSide);
  const score = scoreContract(contract, declarerTricks, vulnerabilityForBoard(board));
  return { contract, state, cardsPlayed, declarerTricks, score };
}

describe('a complete board', () => {
  it('runs from deal to score', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const board = ((seed - 1) % 16) + 1;
      const { contract, state, cardsPlayed, declarerTricks, score } = playWholeBoard(board, seed);

      expect(contract.declarer).toBe(dealerForBoard(board));
      expect(cardsPlayed).toBe(52);
      expect(state.completed).toHaveLength(13);
      expect(tricksWon(state, 'NS') + tricksWon(state, 'EW')).toBe(13);
      for (const seat of SEATS) expect(state.hands[seat]).toHaveLength(0);
      expect(score > 0).toBe(declarerTricks >= 7);
    }
  });

  it('starts with the player left of declarer', () => {
    const deal = dealCards(seededRng(3));
    const auction = [bid(1, 'NT'), PASS, PASS, PASS].reduce(addCall, newAuction('W'));
    const contract = contractOf(auction);
    if (!contract) throw new Error('Expected a contract');
    expect(seatToPlay(startPlay(deal, contract))).toBe('N');
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/core/game.test.ts`
Expected: FAIL, `./index` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/core/index.ts`:

```ts
export * from './cards';
export * from './seats';
export * from './board';
export * from './deal';
export * from './auction';
export * from './play';
export * from './scoring';
```

- [ ] **Step 4: Draai alle tests en de typecontrole**

Run: `npm test && npm run typecheck`
Expected: alle testbestanden PASS (`cards`, `seats`, `board`, `deal`, `auction`, `play`, `scoring`, `game`), typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/core/index.ts src/core/game.test.ts
git commit -m "Add core index and full board integration test"
```
