# Bidding: biedregels voor les 4 tot en met 7 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De module `bidding` bouwen: een regeltabel voor 5-kaart hoog (openen, de 1SA-opening, antwoorden en de herbieding) met een functie die voor een hand en een biedverloop het bod, de gebruikte regel en de Nederlandse uitleg geeft.

**Architecture:** Een biedregel is data: een situatie in het biedverloop, een eis aan de hand (punten, kleurlengtes, verdeeld), één vast bod, een prioriteit, het lesnummer en een uitlegtekst. `selectRule` kiest de passende regel met de hoogste prioriteit. Past er geen regel, dan beslist een vangnet op basis van wat partner met zijn biedingen heeft beloofd (`shownBy`). Dezelfde tabel dient later de bots, de coach en de lessen.

**Tech Stack:** TypeScript (strict), Vitest. Bouwt op `src/core`.

Spec: `docs/superpowers/specs/2026-10-03-bridge-app-design.md`. Dit plan dekt stap 2 van de bouwvolgorde voor les 4 tot en met 7. Tussenbieden (les 10), Stayman en Jacoby (les 11) en de sterke en zwakke openingen (les 13) volgen in latere plannen.

> **Na de eindcontrole aangepast.** De code wijkt op deze punten af van de codeblokken hieronder; de code in `src/bidding` is leidend. (1) Het vangnet geeft alleen nog voorkeur tussen twee kleuren van partner zelf, en hooguit één keer. (2) De herbieding kent bovengrenzen: met 19 of meer punten (15 of meer na een antwoord op 2-niveau) biedt de opener de manche. (3) Een verhoging van 1♣/1♦ naar 3 is 10-11 punten; met 12 of meer en steun volgt 3SA. (4) `explainCall` is vervangen door `meaningsOf`, dat alle betekenissen van een bod geeft. (5) `Choice` heeft een veld `source` (`rule` of `fallback`). (6) Uitlegteksten zeggen "SA-verdeling" in plaats van "verdeeld".

## Global Constraints

- Werkmap voor alle commando's: de map `bridge-app` (de git-root).
- `src/bidding` importeert uit `core` uitsluitend via de index: `'../core'` of `'../../core'`. Nooit rechtstreeks uit een bestand in `src/core`.
- `src/bidding` gebruikt geen DOM- of browser-API's en geen `Math.random`.
- Identifiers, regel-id's en foutmeldingen zijn Engels. Uitlegteksten (`explanation`) zijn Nederlands.
- Notatie in tests: een hand als `'AKJ52.Q73.K4.862'` (schoppen.harten.ruiten.klaveren); een biedverloop als `'1H P 2H P'` met `P` pas, `X` doublet, `XX` redoublet en `NT` voor SA. De gever in tests is Noord, tenzij anders vermeld.
- Punten zijn honneurpunten (aas 4, heer 3, vrouw 2, boer 1). Verdelingspunten worden niet geteld.
- Een verdeelde hand heeft de verdeling 4-3-3-3, 4-4-3-2 of 5-3-3-2.
- Rangorde van kleuren: klaveren, ruiten, harten, schoppen (`SUITS` uit `core`).
- Elke regel heeft een uniek `id`, een `lesson` van 4 tot en met 7, en een `explanation` die begint met het bod in Nederlandse notatie, gevolgd door `: ` (bijvoorbeeld `1♥: ...`, `1SA: ...`, `Pas: ...`).
- Toestand is onveranderlijk; functies muteren hun argumenten niet.
- Tests staan naast de code als `*.test.ts` en importeren `describe`, `it`, `expect` expliciet uit `vitest`.
- Commitbericht: een onderwerpregel, een lege regel, en daarna letterlijk de regel `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Het biedsysteem in dit plan

| Les | Situatie | Bod |
|---|---|---|
| 4 | Openen | Minder dan 12 punten: pas. Vanaf 12: de langste kleur als die 5 of meer kaarten telt (bij gelijke lengte de hoogste); anders 1♦ met 4 of meer ruiten, en anders 1♣ |
| 5 | Openen | 15-17 punten en verdeeld: 1SA (gaat voor op 1 in een kleur) |
| 5 | Antwoord op 1SA | 0-7: pas, of 2♦/2♥/2♠ met een 5-kaart. 8-9: 2SA. Vanaf 10: 4♥/4♠ met een 6-kaart, 3♥/3♠ met een 5-kaart, anders 3SA |
| 5 | Herbieding na 1SA | Na 2 in een kleur: pas. Na 2SA: 3SA met 16-17, anders pas. Na 3♥/3♠: de manche in die kleur met 3 of meer mee, anders 3SA |
| 6 | Antwoord op 1♥/1♠ | 0-5: pas. Met 3 of meer mee: 2 (6-9), 3 (10-11), 4 (vanaf 12). Anders 1♠ over 1♥ met een 4-kaart (vanaf 6), een nieuwe kleur op 2-niveau (vanaf 10; 2♥ belooft 5), of 1SA (6-9) |
| 6 | Antwoord op 1♣/1♦ | 0-5: pas. Nieuwe kleur op 1-niveau met een 4-kaart (vanaf 6). Verdeeld zonder 4-kaart hoog: 2SA (10-11), 3SA (vanaf 12). Nieuwe kleur op 2-niveau (vanaf 10). Steun (4 ruiten of 5 klaveren, geen 4-kaart hoog): 2 (6-9), 3 (vanaf 10). Anders 1SA (6-9) |
| 7 | Herbieding van de opener | Steun voor partners kleur, een nieuwe kleur, SA met een verdeelde hand, of de eigen kleur herhalen; hoger naarmate de hand sterker is. De exacte grenzen staan in Task 7 |

Bij meerdere 4-kaarten wordt de laagste eerst geboden; bij meerdere kleuren van 5 of meer de langste, en bij gelijke lengte de hoogste.

Tegenstanders bieden in dit plan nooit tussen: na een opening passen ze. Dat verandert bij les 10.

## File Structure

| Bestand | Verantwoordelijkheid |
|---|---|
| `src/core/notation.ts` | Tekstnotatie voor biedingen en biedverlopen (`'1NT'`, `'P'`) |
| `src/bidding/evaluate.ts` | Feiten over een hand en de toets of een hand aan een eis voldoet |
| `src/bidding/labels.ts` | Nederlandse namen van kleuren en biedingen |
| `src/bidding/view.ts` | Het biedverloop gezien vanuit de speler die aan de beurt is; herkennen van situaties |
| `src/bidding/rule.ts` | Het type `BiddingRule`, een bouwfunctie en `selectRule` |
| `src/bidding/testing.ts` | Hulpfunctie voor tests: het bod dat een regellijst kiest |
| `src/bidding/rules/suits.ts` | Hulpfuncties voor kleuren (hoog/laag, hoger/lager) |
| `src/bidding/rules/opening.ts` | Openingen (les 4 en de 1SA-opening van les 5) |
| `src/bidding/rules/notrump.ts` | Antwoorden op 1SA en de herbieding erna (les 5) |
| `src/bidding/rules/response.ts` | Antwoorden op 1 in een kleur (les 6) |
| `src/bidding/rules/rebid.ts` | Herbieding van de opener (les 7) |
| `src/bidding/rules/index.ts` | `ALL_RULES`: alle regels bij elkaar |
| `src/bidding/inference.ts` | Wat een speler met zijn biedingen heeft beloofd |
| `src/bidding/fallback.ts` | Het vangnet als geen regel past |
| `src/bidding/engine.ts` | `chooseCall` en `explainCall` |
| `src/bidding/index.ts` | Publieke export van de module |
| `src/bidding/game.test.ts` | Integratietest: volledige biedverlopen |

---

### Task 1: Tekstnotatie voor biedingen in `core`

**Files:**
- Create: `src/core/notation.ts`
- Modify: `src/core/index.ts`
- Test: `src/core/notation.test.ts`

**Interfaces:**
- Consumes (uit `./auction`): `Auction`, `Call`, `Level`, `Strain`, `PASS`, `DOUBLE`, `REDOUBLE`, `LEVELS`, `STRAINS`, `bid(level, strain)`, `addCall(auction, call)`, `newAuction(dealer)`; uit `./seats`: `Seat`
- Produces:
  - `callText(call: Call): string` (`'P'`, `'X'`, `'XX'`, `'1NT'`, `'4S'`)
  - `parseCall(text: string): Call` (gooit een fout bij ongeldige tekst)
  - `sameCall(a: Call, b: Call): boolean`
  - `auctionFrom(dealer: Seat, text: string): Auction` (biedingen gescheiden door spaties; lege tekst geeft een leeg biedverloop; gooit een fout bij een ongeldig bod)

- [ ] **Step 1: Schrijf de falende test**

`src/core/notation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DOUBLE, PASS, REDOUBLE, bid } from './auction';
import { auctionFrom, callText, parseCall, sameCall } from './notation';

describe('callText and parseCall', () => {
  it('writes calls as short text', () => {
    expect(callText(PASS)).toBe('P');
    expect(callText(DOUBLE)).toBe('X');
    expect(callText(REDOUBLE)).toBe('XX');
    expect(callText(bid(1, 'NT'))).toBe('1NT');
    expect(callText(bid(4, 'S'))).toBe('4S');
  });

  it('reads the same text back', () => {
    for (const text of ['P', 'X', 'XX', '1C', '2H', '3NT', '7S']) {
      expect(callText(parseCall(text))).toBe(text);
    }
  });

  it('rejects invalid text', () => {
    for (const text of ['', '8H', '0C', '1X', 'pass', '1']) {
      expect(() => parseCall(text)).toThrow();
    }
  });
});

describe('sameCall', () => {
  it('compares type, level and strain', () => {
    expect(sameCall(bid(1, 'H'), bid(1, 'H'))).toBe(true);
    expect(sameCall(bid(1, 'H'), bid(2, 'H'))).toBe(false);
    expect(sameCall(bid(1, 'H'), bid(1, 'S'))).toBe(false);
    expect(sameCall(PASS, { type: 'pass' })).toBe(true);
    expect(sameCall(PASS, DOUBLE)).toBe(false);
  });
});

describe('auctionFrom', () => {
  it('builds an auction from text', () => {
    const auction = auctionFrom('E', '1H P 2H');
    expect(auction.dealer).toBe('E');
    expect(auction.calls.map(callText)).toEqual(['1H', 'P', '2H']);
  });

  it('accepts empty text', () => {
    expect(auctionFrom('N', '').calls).toEqual([]);
    expect(auctionFrom('N', '   ').calls).toEqual([]);
  });

  it('rejects an illegal sequence', () => {
    expect(() => auctionFrom('N', '2H 1S')).toThrow();
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/core/notation.test.ts`
Expected: FAIL, `./notation` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/core/notation.ts`:

```ts
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
```

Vervang `src/core/index.ts` door:

`src/core/index.ts`:

```ts
export * from './cards';
export * from './seats';
export * from './board';
export * from './deal';
export * from './auction';
export * from './notation';
export * from './play';
export * from './scoring';
```

- [ ] **Step 4: Draai alle tests en de typecontrole**

Run: `npm test && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/core/notation.ts src/core/notation.test.ts src/core/index.ts
git commit -m "Add text notation for calls and auctions"
```

---

### Task 2: Feiten over een hand en eisen aan een hand

**Files:**
- Create: `src/bidding/evaluate.ts`
- Test: `src/bidding/evaluate.test.ts`

**Interfaces:**
- Consumes (uit `'../core'`): `SUITS`, `Hand`, `Suit`, `highCardPoints(hand)`, `suitLength(hand, suit)`, `parseHand(text)` (alleen in de test)
- Produces:
  - `interface HandFacts { readonly hcp: number; readonly lengths: Readonly<Record<Suit, number>>; readonly balanced: boolean }`
  - `handFacts(hand: Hand): HandFacts`
  - `type Range = readonly [min: number, max: number]` (grenzen inbegrepen)
  - `interface Requirement { readonly hcp?: Range; readonly lengths?: Partial<Record<Suit, Range>>; readonly balanced?: boolean; readonly also?: (facts: HandFacts) => boolean }`
  - `meets(facts: HandFacts, requirement: Requirement): boolean` (een ontbrekend veld stelt geen eis)
  - `points(min: number, max?: number): Range` (standaard maximum 40)
  - `lengthOf(suit: Suit, min: number, max?: number): Partial<Record<Suit, Range>>` (standaard maximum 13)
  - `preferredSuit(facts: HandFacts, minLengths: Partial<Record<Suit, number>>): Suit | null`
    Kiest uit de kleuren die in `minLengths` staan en minstens die lengte hebben de langste. Bij gelijke lengte: de hoogste kleur als de lengte 5 of meer is, anders de laagste. Geeft `null` als geen kleur voldoet.

- [ ] **Step 1: Schrijf de falende test**

`src/bidding/evaluate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseHand } from '../core';
import { handFacts, lengthOf, meets, points, preferredSuit } from './evaluate';

const facts = (text: string) => handFacts(parseHand(text));

describe('handFacts', () => {
  it('counts points and suit lengths', () => {
    expect(facts('AKJ52.Q73.K4.862')).toEqual({
      hcp: 13,
      lengths: { S: 5, H: 3, D: 2, C: 3 },
      balanced: true,
    });
  });

  it('recognises balanced shapes', () => {
    expect(facts('AQ42.K73.J63.K52').balanced).toBe(true); // 4-3-3-3
    expect(facts('KQ42.AJ73.Q63.J5').balanced).toBe(true); // 4-4-3-2
    expect(facts('AKJ52.Q73.K4.862').balanced).toBe(true); // 5-3-3-2
  });

  it('recognises unbalanced shapes', () => {
    expect(facts('AKJ52.Q7.K4.8762').balanced).toBe(false); // 5-4-2-2
    expect(facts('KQ42.AJ73.KJ63.5').balanced).toBe(false); // 4-4-4-1
    expect(facts('AQ4.K7.KJ8532.J5').balanced).toBe(false); // 6-3-2-2
  });
});

describe('meets', () => {
  const hand = facts('AKJ52.Q73.K4.862');

  it('accepts a hand without any requirement', () => {
    expect(meets(hand, {})).toBe(true);
  });

  it('checks the point range, bounds included', () => {
    expect(meets(hand, { hcp: points(12) })).toBe(true);
    expect(meets(hand, { hcp: points(13, 13) })).toBe(true);
    expect(meets(hand, { hcp: points(14) })).toBe(false);
    expect(meets(hand, { hcp: points(0, 12) })).toBe(false);
  });

  it('checks suit lengths', () => {
    expect(meets(hand, { lengths: lengthOf('S', 5) })).toBe(true);
    expect(meets(hand, { lengths: lengthOf('S', 6) })).toBe(false);
    expect(meets(hand, { lengths: { H: [0, 3], S: [0, 3] } })).toBe(false);
    expect(meets(hand, { lengths: { H: [0, 3], D: [0, 3] } })).toBe(true);
  });

  it('checks the shape', () => {
    expect(meets(hand, { balanced: true })).toBe(true);
    expect(meets(hand, { balanced: false })).toBe(false);
  });

  it('checks the extra condition', () => {
    expect(meets(hand, { also: (f) => f.lengths.S > f.lengths.H })).toBe(true);
    expect(meets(hand, { also: () => false })).toBe(false);
  });
});

describe('preferredSuit', () => {
  const allFive = { C: 5, D: 5, H: 5, S: 5 };
  const majorsFour = { H: 4, S: 4 };

  it('takes the longest suit', () => {
    expect(preferredSuit(facts('KJ852.Q873.42.86'), majorsFour)).toBe('S');
    expect(preferredSuit(facts('A2.K7.Q8532.AJ54'), allFive)).toBe('D');
  });

  it('takes the higher of two suits of five or more', () => {
    expect(preferredSuit(facts('AK852.KQ963.4.72'), allFive)).toBe('S');
  });

  it('takes the lower of two four-card suits', () => {
    expect(preferredSuit(facts('KJ52.Q873.42.862'), majorsFour)).toBe('H');
  });

  it('ignores suits that are too short or not listed', () => {
    expect(preferredSuit(facts('K52.Q73.J842.862'), majorsFour)).toBeNull();
    expect(preferredSuit(facts('K5.QJ87.A842.862'), { C: 4, D: 4, H: 5 })).toBe('D');
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/bidding/evaluate.test.ts`
Expected: FAIL, `./evaluate` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/bidding/evaluate.ts`:

```ts
import { type Hand, SUITS, type Suit, highCardPoints, suitLength } from '../core';

export interface HandFacts {
  readonly hcp: number;
  readonly lengths: Readonly<Record<Suit, number>>;
  readonly balanced: boolean;
}

const BALANCED_SHAPES = ['4333', '4432', '5332'];

export function handFacts(hand: Hand): HandFacts {
  const lengths = {
    S: suitLength(hand, 'S'),
    H: suitLength(hand, 'H'),
    D: suitLength(hand, 'D'),
    C: suitLength(hand, 'C'),
  };
  const shape = SUITS.map((suit) => lengths[suit])
    .sort((a, b) => b - a)
    .join('');
  return { hcp: highCardPoints(hand), lengths, balanced: BALANCED_SHAPES.includes(shape) };
}

export type Range = readonly [min: number, max: number];

export interface Requirement {
  readonly hcp?: Range;
  readonly lengths?: Partial<Record<Suit, Range>>;
  readonly balanced?: boolean;
  readonly also?: (facts: HandFacts) => boolean;
}

function inRange(value: number, range: Range | undefined): boolean {
  return !range || (value >= range[0] && value <= range[1]);
}

export function meets(facts: HandFacts, requirement: Requirement): boolean {
  return (
    inRange(facts.hcp, requirement.hcp) &&
    SUITS.every((suit) => inRange(facts.lengths[suit], requirement.lengths?.[suit])) &&
    (requirement.balanced === undefined || requirement.balanced === facts.balanced) &&
    (!requirement.also || requirement.also(facts))
  );
}

export function points(min: number, max = 40): Range {
  return [min, max];
}

export function lengthOf(suit: Suit, min: number, max = 13): Partial<Record<Suit, Range>> {
  const lengths: Partial<Record<Suit, Range>> = {};
  lengths[suit] = [min, max];
  return lengths;
}

// Longest listed suit that is long enough; on a tie the higher suit with five or more cards, else the lower
export function preferredSuit(
  facts: HandFacts,
  minLengths: Partial<Record<Suit, number>>,
): Suit | null {
  let best: Suit | null = null;
  for (const suit of SUITS) {
    const min = minLengths[suit];
    const length = facts.lengths[suit];
    if (min === undefined || length < min) continue;
    if (
      best === null ||
      length > facts.lengths[best] ||
      (length === facts.lengths[best] && length >= 5)
    ) {
      best = suit;
    }
  }
  return best;
}
```

- [ ] **Step 4: Draai de test en de typecontrole**

Run: `npm test -- src/bidding/evaluate.test.ts && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/bidding/evaluate.ts src/bidding/evaluate.test.ts
git commit -m "Add hand facts and hand requirements"
```

---

### Task 3: Situaties in het biedverloop, het regeltype en de keuze van een regel

**Files:**
- Create: `src/bidding/labels.ts`, `src/bidding/view.ts`, `src/bidding/rule.ts`, `src/bidding/testing.ts`
- Test: `src/bidding/labels.test.ts`, `src/bidding/view.test.ts`, `src/bidding/rule.test.ts`

**Interfaces:**
- Consumes:
  - uit `'../core'`: `Auction`, `Bid`, `Call`, `Hand`, `Seat`, `Strain`, `Suit`, `callerAt(auction, index)`, `partnerOf(seat)`, `seatToCall(auction)`, `sameCall(a, b)`, `isLegalCall(auction, call)`, `auctionFrom(dealer, text)`, `callText(call)`, `parseHand(text)`
  - uit `./evaluate`: `Requirement`, `handFacts(hand)`, `meets(facts, requirement)`
- Produces:
  - `SUIT_NAME: Readonly<Record<Suit, string>>` (`klaveren`, `ruiten`, `harten`, `schoppen`)
  - `STRAIN_SYMBOL: Readonly<Record<Strain, string>>` (`♣`, `♦`, `♥`, `♠`, `SA`)
  - `callLabel(call: Call): string` (`'1♥'`, `'3SA'`, `'Pas'`, `'Doublet'`, `'Redoublet'`)
  - `interface AuctionView { readonly auction: Auction; readonly seat: Seat; readonly myBids: readonly Bid[]; readonly partnerBids: readonly Bid[]; readonly opponentsSilent: boolean }`
    `seat` is de speler die aan de beurt is. `opponentsSilent` is waar als de tegenstanders alleen gepast hebben.
  - `viewOf(auction: Auction): AuctionView`
  - `isOpening(view: AuctionView): boolean` (nog niemand heeft iets anders dan pas geboden)
  - `isResponseTo(view: AuctionView, opening: Bid): boolean` (partner opende met `opening`, ik heb nog niet geboden, de tegenstanders zwijgen)
  - `isRebidAfter(view: AuctionView, opening: Bid, response: Bid): boolean` (ik opende met `opening`, partner antwoordde `response`, de tegenstanders zwijgen)
  - `interface BiddingRule { readonly id: string; readonly lesson: number; readonly priority: number; readonly call: Call; readonly situation: (view: AuctionView) => boolean; readonly requires: Requirement; readonly explanation: string }`
  - `rule(id: string, lesson: number, priority: number, call: Call, situation: (view: AuctionView) => boolean, requires: Requirement, text: string): BiddingRule`
    Zet `explanation` op `` `${callLabel(call)}: ${text}` ``.
  - `selectRule(rules: readonly BiddingRule[], hand: Hand, auction: Auction, maxLesson?: number): BiddingRule | null`
    De regel met de hoogste prioriteit waarvan de les niet boven `maxLesson` ligt, de situatie past, de hand voldoet en het bod geldig is. Bij gelijke prioriteit wint de eerste in de lijst. `null` als geen regel past.
  - `callFor(rules: readonly BiddingRule[], handText: string, auctionText: string, maxLesson?: number): string` (in `testing.ts`; gever Noord; geeft `callText` van het gekozen bod, of `'none'`)

- [ ] **Step 1: Schrijf de falende tests**

`src/bidding/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DOUBLE, PASS, REDOUBLE, bid } from '../core';
import { SUIT_NAME, callLabel } from './labels';

describe('labels', () => {
  it('names the suits in Dutch', () => {
    expect(SUIT_NAME).toEqual({ C: 'klaveren', D: 'ruiten', H: 'harten', S: 'schoppen' });
  });

  it('writes calls in Dutch notation', () => {
    expect(callLabel(bid(1, 'H'))).toBe('1♥');
    expect(callLabel(bid(2, 'C'))).toBe('2♣');
    expect(callLabel(bid(3, 'NT'))).toBe('3SA');
    expect(callLabel(PASS)).toBe('Pas');
    expect(callLabel(DOUBLE)).toBe('Doublet');
    expect(callLabel(REDOUBLE)).toBe('Redoublet');
  });
});
```

`src/bidding/view.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { auctionFrom, bid, callText } from '../core';
import { isOpening, isRebidAfter, isResponseTo, viewOf } from './view';

const view = (text: string) => viewOf(auctionFrom('N', text));

describe('viewOf', () => {
  it('describes the auction from the seat to call', () => {
    const v = view('1H P 1S P 2C P');
    expect(v.seat).toBe('S');
    expect(v.myBids.map(callText)).toEqual(['1S']);
    expect(v.partnerBids.map(callText)).toEqual(['1H', '2C']);
    expect(v.opponentsSilent).toBe(true);
  });

  it('notices opponents who bid or double', () => {
    expect(view('1H 1S').opponentsSilent).toBe(false);
    expect(view('1H X').opponentsSilent).toBe(false);
    expect(view('1H P').opponentsSilent).toBe(true);
  });
});

describe('isOpening', () => {
  it('is true until someone bids', () => {
    expect(isOpening(view(''))).toBe(true);
    expect(isOpening(view('P P P'))).toBe(true);
    expect(isOpening(view('1H P'))).toBe(false);
    expect(isOpening(view('P 1H'))).toBe(false);
  });
});

describe('isResponseTo', () => {
  it('matches the first call opposite an opening', () => {
    expect(isResponseTo(view('1H P'), bid(1, 'H'))).toBe(true);
    expect(isResponseTo(view('1H P'), bid(1, 'S'))).toBe(false);
  });

  it('also holds for a hand that passed earlier', () => {
    expect(isResponseTo(view('P P 1H P'), bid(1, 'H'))).toBe(true);
  });

  it('fails when an opponent has bid, or after the first response', () => {
    expect(isResponseTo(view('1H 1S'), bid(1, 'H'))).toBe(false);
    expect(isResponseTo(view('1H P 1S P 2C P'), bid(1, 'H'))).toBe(false);
  });

  it('fails for the opponents of the opener', () => {
    expect(isResponseTo(view('1H'), bid(1, 'H'))).toBe(false);
  });
});

describe('isRebidAfter', () => {
  it('matches the opener after a response', () => {
    expect(isRebidAfter(view('1H P 2H P'), bid(1, 'H'), bid(2, 'H'))).toBe(true);
    expect(isRebidAfter(view('1H P 2H P'), bid(1, 'H'), bid(1, 'S'))).toBe(false);
    expect(isRebidAfter(view('P 1H P 1S P'), bid(1, 'H'), bid(1, 'S'))).toBe(true);
  });

  it('fails for the responder and in later rounds', () => {
    expect(isRebidAfter(view('1H P 1S P 2C P'), bid(1, 'H'), bid(1, 'S'))).toBe(false);
    expect(isRebidAfter(view('1H P 1S P 2C P 2H P'), bid(1, 'H'), bid(1, 'S'))).toBe(false);
  });

  it('fails when an opponent has bid', () => {
    expect(isRebidAfter(view('1H P 2H 2S'), bid(1, 'H'), bid(2, 'H'))).toBe(false);
    expect(isRebidAfter(view('1H 1S 2H P'), bid(1, 'H'), bid(2, 'H'))).toBe(false);
  });
});
```

`src/bidding/rule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PASS, auctionFrom, bid, parseHand } from '../core';
import { points } from './evaluate';
import { rule, selectRule } from './rule';
import { callFor } from './testing';

const always = () => true;
const never = () => false;
const low = rule('low', 4, 1, PASS, always, {}, 'laag.');
const high = rule('high', 5, 9, bid(1, 'C'), always, { hcp: points(12) }, 'hoog.');

const STRONG = 'AKJ52.Q73.K4.862'; // 13 points
const WEAK = 'Q8642.K73.84.K62'; // 8 points

describe('rule', () => {
  it('starts the explanation with the call in Dutch notation', () => {
    expect(high.explanation).toBe('1♣: hoog.');
    expect(low.explanation).toBe('Pas: laag.');
  });
});

describe('selectRule', () => {
  const pick = (hand: string, auction: string, maxLesson?: number) =>
    selectRule([low, high], parseHand(hand), auctionFrom('N', auction), maxLesson)?.id;

  it('takes the highest priority rule that fits', () => {
    expect(pick(STRONG, '')).toBe('high');
  });

  it('skips a rule when the hand does not meet its requirement', () => {
    expect(pick(WEAK, '')).toBe('low');
  });

  it('skips rules from later lessons', () => {
    expect(pick(STRONG, '', 4)).toBe('low');
    expect(pick(STRONG, '', 5)).toBe('high');
    expect(pick(STRONG, '', 3)).toBeUndefined();
  });

  it('skips a rule whose call is not legal', () => {
    expect(pick(STRONG, '1D')).toBe('low');
  });

  it('skips a rule whose situation does not apply', () => {
    const blocked = rule('blocked', 4, 99, bid(1, 'S'), never, {}, 'nooit.');
    const chosen = selectRule([blocked, low], parseHand(STRONG), auctionFrom('N', ''));
    expect(chosen?.id).toBe('low');
  });

  it('takes the first rule on equal priority', () => {
    const first = rule('first', 4, 5, bid(1, 'H'), always, {}, 'eerste.');
    const second = rule('second', 4, 5, bid(1, 'S'), always, {}, 'tweede.');
    const chosen = selectRule([first, second], parseHand(STRONG), auctionFrom('N', ''));
    expect(chosen?.id).toBe('first');
  });

  it('returns null when nothing fits', () => {
    expect(selectRule([high], parseHand(WEAK), auctionFrom('N', ''))).toBeNull();
  });
});

describe('callFor', () => {
  it('gives the chosen call as text', () => {
    expect(callFor([low, high], STRONG, '')).toBe('1C');
    expect(callFor([low, high], WEAK, '')).toBe('P');
    expect(callFor([high], WEAK, '')).toBe('none');
    expect(callFor([low, high], STRONG, '', 4)).toBe('P');
  });
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npm test -- src/bidding/labels.test.ts src/bidding/view.test.ts src/bidding/rule.test.ts`
Expected: FAIL, `./labels`, `./view` en `./rule` kunnen niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/bidding/labels.ts`:

```ts
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
```

`src/bidding/view.ts`:

```ts
import {
  type Auction,
  type Bid,
  type Seat,
  callerAt,
  partnerOf,
  sameCall,
  seatToCall,
} from '../core';

export interface AuctionView {
  readonly auction: Auction;
  readonly seat: Seat;
  readonly myBids: readonly Bid[];
  readonly partnerBids: readonly Bid[];
  readonly opponentsSilent: boolean;
}

export function viewOf(auction: Auction): AuctionView {
  const seat = seatToCall(auction);
  const partner = partnerOf(seat);
  const myBids: Bid[] = [];
  const partnerBids: Bid[] = [];
  let opponentsSilent = true;
  auction.calls.forEach((call, index) => {
    const caller = callerAt(auction, index);
    if (caller === seat) {
      if (call.type === 'bid') myBids.push(call);
    } else if (caller === partner) {
      if (call.type === 'bid') partnerBids.push(call);
    } else if (call.type !== 'pass') {
      opponentsSilent = false;
    }
  });
  return { auction, seat, myBids, partnerBids, opponentsSilent };
}

export function isOpening(view: AuctionView): boolean {
  return view.auction.calls.every((call) => call.type === 'pass');
}

export function isResponseTo(view: AuctionView, opening: Bid): boolean {
  return (
    view.opponentsSilent &&
    view.myBids.length === 0 &&
    view.partnerBids.length === 1 &&
    sameCall(view.partnerBids[0], opening)
  );
}

export function isRebidAfter(view: AuctionView, opening: Bid, response: Bid): boolean {
  return (
    view.opponentsSilent &&
    view.myBids.length === 1 &&
    view.partnerBids.length === 1 &&
    sameCall(view.myBids[0], opening) &&
    sameCall(view.partnerBids[0], response)
  );
}
```

`src/bidding/rule.ts`:

```ts
import { type Auction, type Call, type Hand, isLegalCall } from '../core';
import { type Requirement, handFacts, meets } from './evaluate';
import { callLabel } from './labels';
import { type AuctionView, viewOf } from './view';

export interface BiddingRule {
  readonly id: string;
  readonly lesson: number;
  readonly priority: number;
  readonly call: Call;
  readonly situation: (view: AuctionView) => boolean;
  readonly requires: Requirement;
  readonly explanation: string;
}

export function rule(
  id: string,
  lesson: number,
  priority: number,
  call: Call,
  situation: (view: AuctionView) => boolean,
  requires: Requirement,
  text: string,
): BiddingRule {
  return { id, lesson, priority, call, situation, requires, explanation: `${callLabel(call)}: ${text}` };
}

export function selectRule(
  rules: readonly BiddingRule[],
  hand: Hand,
  auction: Auction,
  maxLesson = Infinity,
): BiddingRule | null {
  const view = viewOf(auction);
  const facts = handFacts(hand);
  let best: BiddingRule | null = null;
  for (const candidate of rules) {
    if (candidate.lesson > maxLesson) continue;
    if (best && candidate.priority <= best.priority) continue;
    if (!candidate.situation(view)) continue;
    if (!meets(facts, candidate.requires)) continue;
    if (!isLegalCall(auction, candidate.call)) continue;
    best = candidate;
  }
  return best;
}
```

`src/bidding/testing.ts`:

```ts
import { auctionFrom, callText, parseHand } from '../core';
import { type BiddingRule, selectRule } from './rule';

// Test helper: the call the rules choose for the seat to call, with North as dealer
export function callFor(
  rules: readonly BiddingRule[],
  handText: string,
  auctionText: string,
  maxLesson = Infinity,
): string {
  const chosen = selectRule(rules, parseHand(handText), auctionFrom('N', auctionText), maxLesson);
  return chosen ? callText(chosen.call) : 'none';
}
```

- [ ] **Step 4: Draai de tests en de typecontrole**

Run: `npm test -- src/bidding && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/bidding/labels.ts src/bidding/labels.test.ts src/bidding/view.ts src/bidding/view.test.ts src/bidding/rule.ts src/bidding/rule.test.ts src/bidding/testing.ts
git commit -m "Add auction view, bidding rule type and rule selection"
```

---

### Task 4: Openingen (les 4 en de 1SA-opening)

**Files:**
- Create: `src/bidding/rules/suits.ts`, `src/bidding/rules/opening.ts`
- Test: `src/bidding/rules/suits.test.ts`, `src/bidding/rules/opening.test.ts`

**Interfaces:**
- Consumes:
  - uit `'../../core'`: `PASS`, `SUITS`, `Suit`, `bid(level, strain)`
  - uit `'../evaluate'`: `HandFacts`, `lengthOf(suit, min, max?)`, `points(min, max?)`, `preferredSuit(facts, minLengths)`
  - uit `'../labels'`: `SUIT_NAME`
  - uit `'../rule'`: `BiddingRule`, `rule(id, lesson, priority, call, situation, requires, text)`
  - uit `'../view'`: `isOpening(view)`
  - uit `'../testing'`: `callFor(rules, handText, auctionText, maxLesson?)` (alleen in de test)
- Produces:
  - `isMajor(suit: Suit): boolean`
  - `suitsAbove(suit: Suit): Suit[]` en `suitsBelow(suit: Suit): Suit[]` (in rangorde klaveren, ruiten, harten, schoppen)
  - `minLengths(suits: readonly Suit[], min: (suit: Suit) => number): Partial<Record<Suit, number>>`
  - `openingSuit(facts: HandFacts): Suit`
  - `OPENING_RULES: readonly BiddingRule[]` met de id's `open-1NT` (les 5), `open-1S`, `open-1H`, `open-1D`, `open-1C` en `open-pass` (les 4)

Regels:
- Minder dan 12 punten: pas.
- 15 tot en met 17 punten en verdeeld: 1SA. Deze regel gaat voor op 1 in een kleur.
- Anders vanaf 12 punten: 1 in de openingskleur. Dat is de langste kleur als die 5 of meer kaarten telt (bij gelijke lengte de hoogste). Zonder 5-kaart: ruiten met 4 of meer ruiten, anders klaveren.
- Beloofde lengte: 1♥ en 1♠ minstens 5, 1♦ minstens 4, 1♣ minstens 2.

- [ ] **Step 1: Schrijf de falende tests**

`src/bidding/rules/suits.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isMajor, minLengths, suitsAbove, suitsBelow } from './suits';

describe('suit helpers', () => {
  it('knows the majors', () => {
    expect(['C', 'D', 'H', 'S'].map((s) => isMajor(s as 'C'))).toEqual([false, false, true, true]);
  });

  it('lists higher and lower suits in rank order', () => {
    expect(suitsAbove('D')).toEqual(['H', 'S']);
    expect(suitsAbove('S')).toEqual([]);
    expect(suitsBelow('H')).toEqual(['C', 'D']);
    expect(suitsBelow('C')).toEqual([]);
  });

  it('builds a table of minimum lengths', () => {
    expect(minLengths(['D', 'H'], (suit) => (suit === 'H' ? 5 : 4))).toEqual({ D: 4, H: 5 });
    expect(minLengths([], () => 4)).toEqual({});
  });
});
```

`src/bidding/rules/opening.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { callFor } from '../testing';
import { OPENING_RULES } from './opening';

const open = (hand: string, auction = '', maxLesson = 7) =>
  callFor(OPENING_RULES, hand, auction, maxLesson);

describe('opening one of a suit', () => {
  it('opens a five-card major', () => {
    expect(open('AKJ52.Q73.K4.862')).toBe('1S');
    expect(open('K73.AQJ52.84.K62')).toBe('1H');
  });

  it('opens the higher of two five-card suits', () => {
    expect(open('AK852.KQ963.4.72')).toBe('1S');
  });

  it('opens the longest suit', () => {
    expect(open('AQ4.K7.KJ8532.J5')).toBe('1D');
    expect(open('A2.K7.Q8532.AJ54')).toBe('1D');
  });

  it('opens one diamond with four diamonds and no five-card suit', () => {
    expect(open('KQ4.A72.QJ63.J52')).toBe('1D');
    expect(open('KQ42.AJ73.KJ63.5')).toBe('1D');
  });

  it('opens one club without a five-card suit or four diamonds', () => {
    expect(open('KQ42.AJ73.Q63.J5')).toBe('1C'); // only two clubs
    expect(open('AQ42.K73.J63.K52')).toBe('1C');
    expect(open('KQ42.AJ73.5.KJ63')).toBe('1C');
  });

  it('opens one of a suit with a strong hand that is not 15-17 balanced', () => {
    expect(open('AK2.KQ3.AJ5.KQ62')).toBe('1C'); // 22 points
  });
});

describe('opening one no trump', () => {
  it('opens 1NT with 15-17 balanced', () => {
    expect(open('K42.Q73.AJ5.KQ62')).toBe('1NT');
    expect(open('AQJ52.KJ3.K4.Q62')).toBe('1NT'); // five-card major, still balanced
  });

  it('is not available before lesson 5', () => {
    expect(open('K42.Q73.AJ5.KQ62', '', 4)).toBe('1C');
  });
});

describe('passing', () => {
  it('passes with fewer than 12 points', () => {
    expect(open('Q8642.K73.84.K62')).toBe('P');
  });

  it('opens in any seat after passes', () => {
    expect(open('AKJ52.Q73.K4.862', 'P P P')).toBe('1S');
    expect(open('Q8642.K73.84.K62', 'P P')).toBe('P');
  });

  it('has no opening rule once someone has bid', () => {
    expect(open('AKJ52.Q73.K4.862', '1H')).toBe('none');
  });
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npm test -- src/bidding/rules`
Expected: FAIL, `./suits` en `./opening` kunnen niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/bidding/rules/suits.ts`:

```ts
import { SUITS, type Suit } from '../../core';

export function isMajor(suit: Suit): boolean {
  return suit === 'H' || suit === 'S';
}

export function suitsAbove(suit: Suit): Suit[] {
  return SUITS.filter((other) => SUITS.indexOf(other) > SUITS.indexOf(suit));
}

export function suitsBelow(suit: Suit): Suit[] {
  return SUITS.filter((other) => SUITS.indexOf(other) < SUITS.indexOf(suit));
}

export function minLengths(
  suits: readonly Suit[],
  min: (suit: Suit) => number,
): Partial<Record<Suit, number>> {
  const result: Partial<Record<Suit, number>> = {};
  for (const suit of suits) result[suit] = min(suit);
  return result;
}
```

`src/bidding/rules/opening.ts`:

```ts
import { PASS, type Suit, bid } from '../../core';
import { type HandFacts, lengthOf, points, preferredSuit } from '../evaluate';
import { SUIT_NAME } from '../labels';
import { type BiddingRule, rule } from '../rule';
import { isOpening } from '../view';

export function openingSuit(facts: HandFacts): Suit {
  const longSuit = preferredSuit(facts, { C: 5, D: 5, H: 5, S: 5 });
  if (longSuit) return longSuit;
  return facts.lengths.D >= 4 ? 'D' : 'C';
}

const PROMISED_LENGTH: Readonly<Record<Suit, number>> = { C: 2, D: 4, H: 5, S: 5 };

function openOneOfSuit(suit: Suit): BiddingRule {
  const length = PROMISED_LENGTH[suit];
  return rule(
    `open-1${suit}`,
    4,
    10,
    bid(1, suit),
    isOpening,
    {
      hcp: points(12),
      lengths: lengthOf(suit, length),
      also: (facts) => openingSuit(facts) === suit,
    },
    `vanaf 12 punten en minstens ${length} ${SUIT_NAME[suit]}.`,
  );
}

export const OPENING_RULES: readonly BiddingRule[] = [
  rule(
    'open-1NT',
    5,
    20,
    bid(1, 'NT'),
    isOpening,
    { hcp: points(15, 17), balanced: true },
    '15 tot en met 17 punten en een verdeelde hand.',
  ),
  ...(['S', 'H', 'D', 'C'] as const).map(openOneOfSuit),
  rule(
    'open-pass',
    4,
    1,
    PASS,
    isOpening,
    { hcp: points(0, 11) },
    'minder dan 12 punten, te weinig om te openen.',
  ),
];
```

- [ ] **Step 4: Draai de tests en de typecontrole**

Run: `npm test -- src/bidding && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/bidding/rules/suits.ts src/bidding/rules/suits.test.ts src/bidding/rules/opening.ts src/bidding/rules/opening.test.ts
git commit -m "Add opening rules"
```

---

### Task 5: Antwoorden op 1SA en de herbieding erna (les 5)

**Files:**
- Create: `src/bidding/rules/notrump.ts`
- Test: `src/bidding/rules/notrump.test.ts`

**Interfaces:**
- Consumes:
  - uit `'../../core'`: `Bid`, `PASS`, `bid(level, strain)`, `callText(call)`
  - uit `'../evaluate'`: `lengthOf`, `points`, `preferredSuit`
  - uit `'../labels'`: `SUIT_NAME`
  - uit `'../rule'`: `BiddingRule`, `rule(...)`
  - uit `'../view'`: `AuctionView`, `isResponseTo(view, opening)`, `isRebidAfter(view, opening, response)`
  - uit `'./suits'`: `minLengths(suits, min)`
  - uit `'../testing'`: `callFor(...)` (alleen in de test)
- Produces:
  - `NOTRUMP_RULES: readonly BiddingRule[]`, alle regels met `lesson` 5

Regels voor het antwoord op 1SA (partner opende 1SA):

| Hand | Bod | Prioriteit |
|---|---|---|
| Vanaf 10 punten, 6 of meer harten of schoppen | 4♥ / 4♠ | 50 |
| Vanaf 10 punten, 5 of meer harten of schoppen | 3♥ / 3♠ | 40 |
| Vanaf 10 punten | 3SA | 30 |
| 8 of 9 punten | 2SA | 30 |
| 0-7 punten, 5 of meer ruiten, harten of schoppen | 2 in die kleur (de langste; bij gelijke lengte de hoogste) | 20 |
| 0-7 punten | pas | 10 |

Regels voor de herbieding van de 1SA-opener:

| Antwoord van partner | Bod |
|---|---|
| 2♦, 2♥, 2♠ | pas |
| 2SA | 3SA met 16 of 17 punten, anders pas |
| 3♥ / 3♠ | 4 in die kleur met 3 of meer kaarten mee, anders 3SA |
| 3SA, 4♥, 4♠ | pas |

- [ ] **Step 1: Schrijf de falende test**

`src/bidding/rules/notrump.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { callFor } from '../testing';
import { NOTRUMP_RULES } from './notrump';

const call = (hand: string, auction: string) => callFor(NOTRUMP_RULES, hand, auction);

describe('responding to 1NT', () => {
  const respond = (hand: string) => call(hand, '1NT P');

  it('passes with a weak hand without a five-card suit', () => {
    expect(respond('J52.Q73.9842.862')).toBe('P');
  });

  it('signs off in a five-card suit with a weak hand', () => {
    expect(respond('J8542.Q73.9.8642')).toBe('2S');
    expect(respond('73.QJ852.9.86432')).toBe('2H'); // clubs are not an option
    expect(respond('73.Q85.J9642.864')).toBe('2D');
  });

  it('invites with 8 or 9 points', () => {
    expect(respond('K52.Q73.J842.Q62')).toBe('2NT');
  });

  it('bids game with 10 or more points', () => {
    expect(respond('K52.Q73.A842.Q62')).toBe('3NT');
  });

  it('shows a five-card major with 10 or more points', () => {
    expect(respond('KJ852.Q73.A4.862')).toBe('3S');
    expect(respond('K52.QJ873.A4.862')).toBe('3H');
  });

  it('bids game in a six-card major with 10 or more points', () => {
    expect(respond('KJ8542.Q7.A4.862')).toBe('4S');
    expect(respond('K5.QJ8742.A4.862')).toBe('4H');
  });

  it('has no rule opposite another opening', () => {
    expect(call('K52.Q73.A842.Q62', '1H P')).toBe('none');
  });
});

describe('rebid by the 1NT opener', () => {
  const MINIMUM = 'K42.Q73.AJ5.KQ62'; // 15 points, three spades
  const MAXIMUM = 'AQJ52.KJ3.K4.Q62'; // 16 points

  it('passes a sign-off', () => {
    expect(call(MAXIMUM, '1NT P 2H P')).toBe('P');
    expect(call(MAXIMUM, '1NT P 2D P')).toBe('P');
    expect(call(MINIMUM, '1NT P 2S P')).toBe('P');
  });

  it('accepts the invitation with 16 or 17 points', () => {
    expect(call(MAXIMUM, '1NT P 2NT P')).toBe('3NT');
    expect(call(MINIMUM, '1NT P 2NT P')).toBe('P');
  });

  it('chooses between 3NT and four of the major', () => {
    expect(call(MINIMUM, '1NT P 3S P')).toBe('4S');
    expect(call('K4.Q73.AJ52.KQ62', '1NT P 3S P')).toBe('3NT');
    expect(call(MINIMUM, '1NT P 3H P')).toBe('4H');
  });

  it('passes when game has been bid', () => {
    expect(call(MAXIMUM, '1NT P 3NT P')).toBe('P');
    expect(call(MAXIMUM, '1NT P 4H P')).toBe('P');
    expect(call(MAXIMUM, '1NT P 4S P')).toBe('P');
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/bidding/rules/notrump.test.ts`
Expected: FAIL, `./notrump` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/bidding/rules/notrump.ts`:

```ts
import { type Bid, PASS, bid, callText } from '../../core';
import { lengthOf, points, preferredSuit } from '../evaluate';
import { SUIT_NAME } from '../labels';
import { type BiddingRule, rule } from '../rule';
import { type AuctionView, isRebidAfter, isResponseTo } from '../view';
import { minLengths } from './suits';

const LESSON = 5;
const OPENING = bid(1, 'NT');
const MAJORS = ['H', 'S'] as const;
const SIGN_OFF_SUITS = ['D', 'H', 'S'] as const;
const GAME_RESPONSES = [bid(3, 'NT'), bid(4, 'H'), bid(4, 'S')];

const response = (view: AuctionView) => isResponseTo(view, OPENING);
const after = (partnerBid: Bid) => (view: AuctionView) => isRebidAfter(view, OPENING, partnerBid);
const signOffLengths = minLengths(SIGN_OFF_SUITS, () => 5);

export const NOTRUMP_RULES: readonly BiddingRule[] = [
  ...MAJORS.map((major) =>
    rule(
      `nt-resp-4${major}`,
      LESSON,
      50,
      bid(4, major),
      response,
      { hcp: points(10), lengths: lengthOf(major, 6) },
      `vanaf 10 punten en minstens 6 ${SUIT_NAME[major]}; genoeg voor de manche.`,
    ),
  ),
  ...MAJORS.map((major) =>
    rule(
      `nt-resp-3${major}`,
      LESSON,
      40,
      bid(3, major),
      response,
      { hcp: points(10), lengths: lengthOf(major, 5) },
      `vanaf 10 punten en minstens 5 ${SUIT_NAME[major]}; partner kiest tussen 3SA en de manche in ${SUIT_NAME[major]}.`,
    ),
  ),
  rule(
    'nt-resp-3NT',
    LESSON,
    30,
    bid(3, 'NT'),
    response,
    { hcp: points(10) },
    'vanaf 10 punten, genoeg voor de manche.',
  ),
  rule(
    'nt-resp-2NT',
    LESSON,
    30,
    bid(2, 'NT'),
    response,
    { hcp: points(8, 9) },
    '8 of 9 punten; uitnodiging voor de manche.',
  ),
  ...SIGN_OFF_SUITS.map((suit) =>
    rule(
      `nt-resp-2${suit}`,
      LESSON,
      20,
      bid(2, suit),
      response,
      {
        hcp: points(0, 7),
        lengths: lengthOf(suit, 5),
        also: (facts) => preferredSuit(facts, signOffLengths) === suit,
      },
      `hooguit 7 punten en minstens 5 ${SUIT_NAME[suit]}; partner past.`,
    ),
  ),
  rule(
    'nt-resp-pass',
    LESSON,
    10,
    PASS,
    response,
    { hcp: points(0, 7) },
    'hooguit 7 punten, 1SA is hoog genoeg.',
  ),

  ...SIGN_OFF_SUITS.map((suit) =>
    rule(
      `nt-rebid-pass-after-2${suit}`,
      LESSON,
      10,
      PASS,
      after(bid(2, suit)),
      {},
      'partner is zwak en wil dit contract spelen.',
    ),
  ),
  rule(
    'nt-rebid-3NT-after-2NT',
    LESSON,
    20,
    bid(3, 'NT'),
    after(bid(2, 'NT')),
    { hcp: points(16) },
    '16 of 17 punten, de uitnodiging wordt aangenomen.',
  ),
  rule(
    'nt-rebid-pass-after-2NT',
    LESSON,
    10,
    PASS,
    after(bid(2, 'NT')),
    {},
    '15 punten, de uitnodiging wordt afgeslagen.',
  ),
  ...MAJORS.map((major) =>
    rule(
      `nt-rebid-4${major}-after-3${major}`,
      LESSON,
      20,
      bid(4, major),
      after(bid(3, major)),
      { lengths: lengthOf(major, 3) },
      `minstens 3 ${SUIT_NAME[major]} mee, samen minstens 8 troeven.`,
    ),
  ),
  ...MAJORS.map((major) =>
    rule(
      `nt-rebid-3NT-after-3${major}`,
      LESSON,
      10,
      bid(3, 'NT'),
      after(bid(3, major)),
      {},
      `maar 2 ${SUIT_NAME[major]}, geen fit.`,
    ),
  ),
  ...GAME_RESPONSES.map((game) =>
    rule(
      `nt-rebid-pass-after-${callText(game)}`,
      LESSON,
      10,
      PASS,
      after(game),
      {},
      'de manche is geboden.',
    ),
  ),
];
```

- [ ] **Step 4: Draai de tests en de typecontrole**

Run: `npm test -- src/bidding && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/bidding/rules/notrump.ts src/bidding/rules/notrump.test.ts
git commit -m "Add rules for responding to 1NT and the opener's rebid"
```

---

### Task 6: Antwoorden op 1 in een kleur (les 6)

**Files:**
- Create: `src/bidding/rules/response.ts`
- Test: `src/bidding/rules/response.test.ts`

**Interfaces:**
- Consumes:
  - uit `'../../core'`: `PASS`, `SUITS`, `Suit`, `bid(level, strain)`
  - uit `'../evaluate'`: `lengthOf`, `points`, `preferredSuit`
  - uit `'../labels'`: `SUIT_NAME`
  - uit `'../rule'`: `BiddingRule`, `rule(...)`
  - uit `'../view'`: `AuctionView`, `isResponseTo(view, opening)`
  - uit `'./suits'`: `isMajor`, `minLengths`, `suitsAbove`, `suitsBelow`
  - uit `'../testing'`: `callFor(...)` (alleen in de test)
- Produces:
  - `RESPONSE_RULES: readonly BiddingRule[]`, alle regels met `lesson` 6. Id's hebben de vorm `resp-<soort>-<openingskleur>`, bijvoorbeeld `resp-raise2-H`, `resp-1S-over-H`, `resp-2C-over-S`, `resp-1NT-D`, `resp-pass-C`.

Regels per openingskleur, van hoge naar lage prioriteit:

| Prioriteit | Opening | Hand | Bod |
|---|---|---|---|
| 60 | 1♥/1♠ | 3 of meer kaarten mee | 2 (6-9), 3 (10-11), 4 (vanaf 12) |
| 50 | alle | vanaf 6 punten, 4 of meer in een kleur die hoger is dan de openingskleur | 1 in die kleur |
| 45 | 1♣/1♦ | verdeeld, hooguit 3 harten en 3 schoppen | 2SA (10-11), 3SA (vanaf 12) |
| 40 | alle | vanaf 10 punten, 4 of meer in een lagere kleur (voor harten 5 of meer) | 2 in die kleur |
| 30 | 1♣/1♦ | steun (4 ruiten of 5 klaveren), hooguit 3 harten en 3 schoppen | 2 (6-9), 3 (vanaf 10) |
| 20 | alle | 6-9 punten | 1SA |
| 5 | alle | 0-5 punten | pas |

Bij meerdere biedbare kleuren op hetzelfde niveau kiest `preferredSuit` de kleur: de langste, bij twee 4-kaarten de laagste, bij twee kleuren van 5 of meer de hoogste.

- [ ] **Step 1: Schrijf de falende test**

`src/bidding/rules/response.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { callFor } from '../testing';
import { RESPONSE_RULES } from './response';

const respond = (opening: string, hand: string) => callFor(RESPONSE_RULES, hand, `${opening} P`);

describe('responding to one of a major', () => {
  it('passes with fewer than 6 points', () => {
    expect(respond('1H', 'J52.Q73.9842.862')).toBe('P');
    expect(respond('1H', 'K52.Q73.9842.862')).toBe('P');
  });

  it('raises with three-card support', () => {
    expect(respond('1H', 'K52.Q73.J842.862')).toBe('2H');
    expect(respond('1H', 'K52.QJ73.A842.82')).toBe('3H');
    expect(respond('1H', 'K52.QJ73.A842.K2')).toBe('4H');
    expect(respond('1S', 'K52.Q73.J842.862')).toBe('2S');
  });

  it('bids one spade over one heart with four spades and no support', () => {
    expect(respond('1H', 'KJ52.73.Q842.862')).toBe('1S');
  });

  it('bids 1NT with 6-9 points and nothing else to say', () => {
    expect(respond('1H', 'K52.73.Q842.J862')).toBe('1NT');
    expect(respond('1S', '52.QJ873.K842.86')).toBe('1NT');
  });

  it('bids a new suit at the two level with 10 or more points', () => {
    expect(respond('1H', 'K52.73.AQ842.J86')).toBe('2D');
    expect(respond('1H', 'K52.73.AQ84.KJ86')).toBe('2C'); // lower of two four-card suits
    expect(respond('1S', 'K5.QJ87.A842.862')).toBe('2D'); // 2H would need five hearts
    expect(respond('1S', 'K5.QJ873.A842.86')).toBe('2H');
  });
});

describe('responding to one of a minor', () => {
  it('bids four-card suits up the line', () => {
    expect(respond('1D', 'KJ52.Q873.42.862')).toBe('1H');
    expect(respond('1C', 'KJ52.Q873.J42.86')).toBe('1H');
    expect(respond('1C', 'K52.Q73.J842.862')).toBe('1D');
  });

  it('bids the longer major first', () => {
    expect(respond('1D', 'KJ852.Q873.42.86')).toBe('1S');
  });

  it('raises the minor without a four-card major', () => {
    expect(respond('1D', 'K52.Q73.J842.862')).toBe('2D');
    expect(respond('1D', 'K5.73.AJ8642.Q62')).toBe('3D');
    expect(respond('1C', 'K52.73.842.QJ862')).toBe('2C');
  });

  it('bids no trump with a balanced hand without a four-card major', () => {
    expect(respond('1D', 'K52.Q73.J8.Q8642')).toBe('1NT');
    expect(respond('1C', 'K52.Q73.842.J862')).toBe('1NT');
    expect(respond('1D', 'K52.Q73.AJ42.862')).toBe('2NT');
    expect(respond('1D', 'K52.A73.AJ42.862')).toBe('3NT');
  });

  it('bids two clubs over one diamond with 10 or more points and clubs', () => {
    expect(respond('1D', 'K52.A7.84.KQ8642')).toBe('2C');
  });

  it('passes with fewer than 6 points', () => {
    expect(respond('1C', 'J52.Q73.9842.862')).toBe('P');
  });
});

describe('situation', () => {
  it('has no rule opposite 1NT or after an overcall', () => {
    expect(callFor(RESPONSE_RULES, 'K52.Q73.J842.862', '1NT P')).toBe('none');
    expect(callFor(RESPONSE_RULES, 'K52.Q73.J842.862', '1H 1S')).toBe('none');
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/bidding/rules/response.test.ts`
Expected: FAIL, `./response` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/bidding/rules/response.ts`:

```ts
import { PASS, SUITS, type Suit, bid } from '../../core';
import { lengthOf, points, preferredSuit } from '../evaluate';
import { SUIT_NAME } from '../labels';
import { type BiddingRule, rule } from '../rule';
import { type AuctionView, isResponseTo } from '../view';
import { isMajor, minLengths, suitsAbove, suitsBelow } from './suits';

const LESSON = 6;
const NO_FOUR_CARD_MAJOR = { H: [0, 3], S: [0, 3] } as const;

// Two hearts over one spade promises five; other new suits promise four
function twoLevelLength(suit: Suit): number {
  return suit === 'H' ? 5 : 4;
}

function responsesTo(opened: Suit): BiddingRule[] {
  const situation = (view: AuctionView) => isResponseTo(view, bid(1, opened));
  const openedName = SUIT_NAME[opened];
  const rules: BiddingRule[] = [];

  if (isMajor(opened)) {
    const support = lengthOf(opened, 3);
    rules.push(
      rule(
        `resp-raise2-${opened}`,
        LESSON,
        60,
        bid(2, opened),
        situation,
        { hcp: points(6, 9), lengths: support },
        `6 tot en met 9 punten en minstens 3 ${openedName} mee.`,
      ),
      rule(
        `resp-raise3-${opened}`,
        LESSON,
        60,
        bid(3, opened),
        situation,
        { hcp: points(10, 11), lengths: support },
        `10 of 11 punten en minstens 3 ${openedName} mee; uitnodiging voor de manche.`,
      ),
      rule(
        `resp-raise4-${opened}`,
        LESSON,
        60,
        bid(4, opened),
        situation,
        { hcp: points(12), lengths: support },
        `vanaf 12 punten en minstens 3 ${openedName} mee.`,
      ),
    );
  }

  const oneLevel = suitsAbove(opened);
  const oneLevelLengths = minLengths(oneLevel, () => 4);
  for (const suit of oneLevel) {
    rules.push(
      rule(
        `resp-1${suit}-over-${opened}`,
        LESSON,
        50,
        bid(1, suit),
        situation,
        {
          hcp: points(6),
          lengths: lengthOf(suit, 4),
          also: (facts) => preferredSuit(facts, oneLevelLengths) === suit,
        },
        `vanaf 6 punten en minstens 4 ${SUIT_NAME[suit]}.`,
      ),
    );
  }

  if (!isMajor(opened)) {
    rules.push(
      rule(
        `resp-3NT-${opened}`,
        LESSON,
        45,
        bid(3, 'NT'),
        situation,
        { hcp: points(12), balanced: true, lengths: NO_FOUR_CARD_MAJOR },
        'vanaf 12 punten, verdeeld, geen 4-kaart harten of schoppen.',
      ),
      rule(
        `resp-2NT-${opened}`,
        LESSON,
        45,
        bid(2, 'NT'),
        situation,
        { hcp: points(10, 11), balanced: true, lengths: NO_FOUR_CARD_MAJOR },
        '10 of 11 punten, verdeeld, geen 4-kaart harten of schoppen.',
      ),
    );
  }

  const twoLevel = suitsBelow(opened);
  const twoLevelLengths = minLengths(twoLevel, twoLevelLength);
  for (const suit of twoLevel) {
    rules.push(
      rule(
        `resp-2${suit}-over-${opened}`,
        LESSON,
        40,
        bid(2, suit),
        situation,
        {
          hcp: points(10),
          lengths: lengthOf(suit, twoLevelLength(suit)),
          also: (facts) => preferredSuit(facts, twoLevelLengths) === suit,
        },
        `vanaf 10 punten en minstens ${twoLevelLength(suit)} ${SUIT_NAME[suit]}.`,
      ),
    );
  }

  if (!isMajor(opened)) {
    const supportLength = opened === 'C' ? 5 : 4;
    const support = { ...NO_FOUR_CARD_MAJOR, ...lengthOf(opened, supportLength) };
    rules.push(
      rule(
        `resp-raise2-${opened}`,
        LESSON,
        30,
        bid(2, opened),
        situation,
        { hcp: points(6, 9), lengths: support },
        `6 tot en met 9 punten en minstens ${supportLength} ${openedName} mee, geen 4-kaart harten of schoppen.`,
      ),
      rule(
        `resp-raise3-${opened}`,
        LESSON,
        30,
        bid(3, opened),
        situation,
        { hcp: points(10), lengths: support },
        `vanaf 10 punten en minstens ${supportLength} ${openedName} mee, geen 4-kaart harten of schoppen.`,
      ),
    );
  }

  rules.push(
    rule(
      `resp-1NT-${opened}`,
      LESSON,
      20,
      bid(1, 'NT'),
      situation,
      { hcp: points(6, 9) },
      '6 tot en met 9 punten, geen steun en geen kleur om op 1-niveau te bieden.',
    ),
    rule(
      `resp-pass-${opened}`,
      LESSON,
      5,
      PASS,
      situation,
      { hcp: points(0, 5) },
      'minder dan 6 punten, te weinig om te antwoorden.',
    ),
  );
  return rules;
}

export const RESPONSE_RULES: readonly BiddingRule[] = SUITS.flatMap(responsesTo);
```

- [ ] **Step 4: Draai de tests en de typecontrole**

Run: `npm test -- src/bidding && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/bidding/rules/response.ts src/bidding/rules/response.test.ts
git commit -m "Add rules for responding to one of a suit"
```

---

### Task 7: De herbieding van de opener (les 7)

**Files:**
- Create: `src/bidding/rules/rebid.ts`
- Test: `src/bidding/rules/rebid.test.ts`

**Interfaces:**
- Consumes:
  - uit `'../../core'`: `Bid`, `Call`, `PASS`, `SUITS`, `Suit`, `bid(level, strain)`, `callText(call)`
  - uit `'../evaluate'`: `Requirement`, `lengthOf`, `points`, `preferredSuit`
  - uit `'../labels'`: `SUIT_NAME`
  - uit `'../rule'`: `BiddingRule`, `rule(...)`
  - uit `'../view'`: `AuctionView`, `isRebidAfter(view, opening, response)`
  - uit `'./suits'`: `isMajor`, `minLengths`, `suitsAbove`, `suitsBelow`
  - uit `'../testing'`: `callFor(...)` (alleen in de test)
- Produces:
  - `REBID_RULES: readonly BiddingRule[]`, alle regels met `lesson` 7. Id's hebben de vorm `rebid-<opening>-<antwoord>-<soort>`, bijvoorbeeld `rebid-1H-2H-invite`, `rebid-1H-1S-raise2`, `rebid-1D-1S-reverse-H`.

Regels. De opener heeft 1 in kleur X geopend. "Tweede kleur" betekent minstens 4 kaarten; bij meerdere kiest `preferredSuit`.

**Na een verhoging van de openingskleur**

| Opening | Antwoord | Herbieding |
|---|---|---|
| 1♥/1♠ | 2 in X | pas (hooguit 15), 3 in X (16-18), 4 in X (vanaf 19) |
| 1♥/1♠ | 3 in X | pas (hooguit 13), 4 in X (vanaf 14) |
| 1♥/1♠ | 4 in X | pas |
| 1♣/1♦ | 2 in X | pas (hooguit 17), 3SA (vanaf 18) |
| 1♣/1♦ | 3 in X | pas (hooguit 13), 3SA (vanaf 14) |
| 1♣/1♦ | 2SA | pas (hooguit 13), 3SA (vanaf 14) |
| 1♣/1♦ | 3SA | pas |

**Na een antwoord van 1SA**

| Prioriteit | Hand | Herbieding |
|---|---|---|
| 40 | vanaf 18 punten, verdeeld | 3SA |
| 35 | X is harten of schoppen, 6 of meer in X, vanaf 19 punten | 4 in X |
| 30 | 6 of meer in X | 2 in X (12-15), 3 in X (vanaf 16) |
| 20 | vanaf 12 punten, tweede kleur lager dan X | 2 in die kleur |
| 15 | vanaf 19 punten | 3SA |
| 5 | alle andere handen | pas |

**Na een nieuwe kleur Y op 1-niveau**

| Prioriteit | Hand | Herbieding |
|---|---|---|
| 60 | Y is harten of schoppen, 4 of meer in Y | 2 in Y (12-15), 3 in Y (16-18), 4 in Y (vanaf 19) |
| 50 | vanaf 12 punten, tweede kleur hoger dan Y | 1 in die kleur |
| 45 | Y is ruiten, 4 of meer ruiten | 2♦ (12-15), 3♦ (vanaf 16) |
| 40 | verdeeld | 1SA (12-14), 2SA (vanaf 18) |
| 30 | 6 of meer in X | 2 in X (12-15), 3 in X (vanaf 16) |
| 25 | vanaf 12 punten, tweede kleur lager dan X | 2 in die kleur |
| 22 | vanaf 16 punten, tweede kleur tussen X en Y | 2 in die kleur |
| 10 | 5 of meer in X | 2 in X |

**Na een nieuwe kleur Y op 2-niveau**

| Prioriteit | Hand | Herbieding |
|---|---|---|
| 60 | Y is harten, 3 of meer harten | 3♥ (12-14), 4♥ (vanaf 15) |
| 40 | verdeeld | 2SA (12-14), 3SA (vanaf 18) |
| 35 | Y is klaveren of ruiten, 4 of meer in Y, vanaf 12 punten | 3 in Y |
| 30 | 6 of meer in X | 2 in X (12-14), 3 in X (vanaf 15) |
| 25 | vanaf 12 punten, tweede kleur tussen Y en X | 2 in die kleur |
| 22 | vanaf 15 punten, tweede kleur hoger dan X | 2 in die kleur |
| 5 | alle andere handen | 2 in X |

- [ ] **Step 1: Schrijf de falende test**

`src/bidding/rules/rebid.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { callFor } from '../testing';
import { REBID_RULES } from './rebid';

const rebid = (auction: string, hand: string) => callFor(REBID_RULES, hand, `${auction} P`);

describe('after a raise of the major', () => {
  it('passes, invites or bids game after a single raise', () => {
    expect(rebid('1H P 2H', 'K73.AQJ52.84.K62')).toBe('P'); // 13
    expect(rebid('1H P 2H', 'K73.AQJ52.A.K962')).toBe('3H'); // 17
    expect(rebid('1H P 2H', 'K73.AQJ52.A4.KQ2')).toBe('4H'); // 19
  });

  it('accepts the invitation with 14 or more points', () => {
    expect(rebid('1H P 3H', 'K73.AQJ52.84.K62')).toBe('P'); // 13
    expect(rebid('1H P 3H', 'K73.AQJ52.4.KQ62')).toBe('4H'); // 15
  });

  it('passes when game has been bid', () => {
    expect(rebid('1S P 4S', 'AKJ52.Q73.K.A862')).toBe('P');
  });
});

describe('after a raise of the minor or a no trump response', () => {
  it('passes with a minimum', () => {
    expect(rebid('1D P 2D', 'KQ4.A72.QJ63.J52')).toBe('P'); // 13
    expect(rebid('1D P 3D', 'KQ4.A72.QJ63.J52')).toBe('P');
    expect(rebid('1D P 2NT', 'KQ4.A72.QJ63.J52')).toBe('P');
    expect(rebid('1D P 3NT', 'KQ4.A72.QJ63.J52')).toBe('P');
  });

  it('bids 3NT with enough for game', () => {
    expect(rebid('1D P 3D', 'KQ4.A72.KJ63.J52')).toBe('3NT'); // 14
    expect(rebid('1D P 2NT', 'KQ4.A72.KJ63.J52')).toBe('3NT');
    expect(rebid('1C P 2C', 'AK2.KQ3.AJ5.Q862')).toBe('3NT'); // 19
  });
});

describe('after a 1NT response', () => {
  it('passes with a balanced minimum', () => {
    expect(rebid('1H P 1NT', 'K73.AQJ52.84.K62')).toBe('P');
  });

  it('rebids a six-card suit', () => {
    expect(rebid('1H P 1NT', 'K7.AQJ852.84.K62')).toBe('2H'); // 13
    expect(rebid('1H P 1NT', 'A7.AQJ852.K4.K62')).toBe('3H'); // 17
  });

  it('shows a lower second suit', () => {
    expect(rebid('1H P 1NT', 'K7.AQJ52.84.KJ62')).toBe('2C');
  });

  it('bids 3NT with 18 or more balanced', () => {
    expect(rebid('1H P 1NT', 'AK3.AQJ52.K4.Q62')).toBe('3NT'); // 19
  });

  it('bids game with 19 or more points and an unbalanced hand', () => {
    expect(rebid('1H P 1NT', 'A7.AQJ852.K4.KQ2')).toBe('4H'); // 19, six hearts
    expect(rebid('1D P 1NT', 'AKQ2.AQ73.KJ63.5')).toBe('3NT'); // 19, 4-4-4-1
  });
});

describe('after a new suit at the one level', () => {
  it('raises a major with four-card support', () => {
    expect(rebid('1H P 1S', 'KJ73.AQJ52.84.K2')).toBe('2S'); // 14
    expect(rebid('1H P 1S', 'AK73.AQJ52.84.K2')).toBe('3S'); // 17
    expect(rebid('1H P 1S', 'AK73.AQJ52.A4.K2')).toBe('4S'); // 21
  });

  it('bids a new suit at the one level', () => {
    expect(rebid('1C P 1H', 'AQ42.K73.J63.K52')).toBe('1S');
  });

  it('bids no trump with a balanced hand', () => {
    expect(rebid('1H P 1S', 'K73.AQJ52.84.K62')).toBe('1NT'); // 13
    expect(rebid('1H P 1S', 'AK3.AQJ52.K4.Q62')).toBe('2NT'); // 19
  });

  it('rebids a six-card suit', () => {
    expect(rebid('1H P 1S', 'K7.AQJ852.84.K62')).toBe('2H');
  });

  it('shows a lower second suit', () => {
    expect(rebid('1H P 1S', 'K7.AQJ52.84.KJ62')).toBe('2C');
  });

  it('reverses only with 16 or more points', () => {
    expect(rebid('1D P 1S', 'K7.AQJ5.AK852.62')).toBe('2H'); // 17
    expect(rebid('1D P 1S', 'K7.AQJ5.K8542.62')).toBe('2D'); // 13
  });

  it('raises diamonds after one club', () => {
    expect(rebid('1C P 1D', 'K7.A52.KJ84.Q862')).toBe('2D'); // 13
  });
});

describe('after a new suit at the two level', () => {
  it('bids no trump with a balanced hand', () => {
    expect(rebid('1S P 2C', 'AKJ52.Q73.K4.862')).toBe('2NT'); // 13
    expect(rebid('1S P 2C', 'AKJ52.Q7.KQ4.A62')).toBe('3NT'); // 19
  });

  it('raises the minor with four-card support', () => {
    expect(rebid('1S P 2C', 'AKJ52.Q7.K4.8762')).toBe('3C');
  });

  it('rebids a six-card suit', () => {
    expect(rebid('1S P 2C', 'AKJ852.Q7.K4.862')).toBe('2S');
  });

  it('shows a second suit between the two suits', () => {
    expect(rebid('1S P 2C', 'AKJ52.Q873.K4.62')).toBe('2H');
  });

  it('raises hearts with three-card support', () => {
    expect(rebid('1S P 2H', 'AKJ52.Q73.K4.862')).toBe('3H'); // 13
    expect(rebid('1S P 2H', 'AKJ52.Q73.K.A862')).toBe('4H'); // 17
  });

  it('repeats the opening suit when nothing else fits', () => {
    expect(rebid('1D P 2C', 'KQ42.AJ73.K863.5')).toBe('2D'); // 13, 4-4-4-1
  });
});

describe('situation', () => {
  it('has no rule for the responder or after 1NT', () => {
    expect(callFor(REBID_RULES, 'KJ852.73.Q842.86', '1H P 1S P 2C P')).toBe('none');
    expect(callFor(REBID_RULES, 'K42.Q73.AJ5.KQ62', '1NT P 2NT P')).toBe('none');
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/bidding/rules/rebid.test.ts`
Expected: FAIL, `./rebid` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/bidding/rules/rebid.ts`:

```ts
import { type Bid, type Call, PASS, SUITS, type Suit, bid, callText } from '../../core';
import { type Requirement, lengthOf, points, preferredSuit } from '../evaluate';
import { SUIT_NAME } from '../labels';
import { type BiddingRule, rule } from '../rule';
import { type AuctionView, isRebidAfter } from '../view';
import { isMajor, minLengths, suitsAbove, suitsBelow } from './suits';

const LESSON = 7;
const FOUR_CARDS = () => 4;

function rebidsAfter(opened: Suit): BiddingRule[] {
  const opening = bid(1, opened);
  const openedName = SUIT_NAME[opened];
  const rules: BiddingRule[] = [];

  const add = (
    response: Bid,
    kind: string,
    priority: number,
    call: Call,
    requires: Requirement,
    text: string,
  ): void => {
    rules.push(
      rule(
        `rebid-${callText(opening)}-${callText(response)}-${kind}`,
        LESSON,
        priority,
        call,
        (view: AuctionView) => isRebidAfter(view, opening, response),
        requires,
        text,
      ),
    );
  };

  const secondSuits = (response: Bid, suits: readonly Suit[], level: 1 | 2, priority: number, minPoints: number, kind: string, text: string): void => {
    const lengths = minLengths(suits, FOUR_CARDS);
    for (const suit of suits) {
      add(
        response,
        `${kind}-${suit}`,
        priority,
        bid(level, suit),
        {
          hcp: points(minPoints),
          lengths: lengthOf(suit, 4),
          also: (facts) => preferredSuit(facts, lengths) === suit,
        },
        `${text}: minstens 4 ${SUIT_NAME[suit]}.`,
      );
    }
  };

  // Partner raised the opening suit, or answered a minor opening in no trump
  if (isMajor(opened)) {
    add(bid(2, opened), 'pass', 10, PASS, { hcp: points(0, 15) }, 'hooguit 15 punten, de manche zit er niet in.');
    add(bid(2, opened), 'invite', 20, bid(3, opened), { hcp: points(16, 18) }, '16 tot en met 18 punten; uitnodiging voor de manche.');
    add(bid(2, opened), 'game', 20, bid(4, opened), { hcp: points(19) }, 'vanaf 19 punten, genoeg voor de manche.');
    add(bid(3, opened), 'pass', 10, PASS, { hcp: points(0, 13) }, 'een minimum, de uitnodiging wordt afgeslagen.');
    add(bid(3, opened), 'game', 20, bid(4, opened), { hcp: points(14) }, 'vanaf 14 punten, de uitnodiging wordt aangenomen.');
    add(bid(4, opened), 'pass', 10, PASS, {}, 'de manche is geboden.');
  } else {
    add(bid(2, opened), 'pass', 10, PASS, { hcp: points(0, 17) }, 'hooguit 17 punten, de manche zit er niet in.');
    add(bid(2, opened), 'game', 20, bid(3, 'NT'), { hcp: points(18) }, 'vanaf 18 punten, genoeg voor de manche.');
    add(bid(3, opened), 'pass', 10, PASS, { hcp: points(0, 13) }, 'een minimum.');
    add(bid(3, opened), 'game', 20, bid(3, 'NT'), { hcp: points(14) }, 'vanaf 14 punten, genoeg voor de manche.');
    add(bid(2, 'NT'), 'pass', 10, PASS, { hcp: points(0, 13) }, 'een minimum, de uitnodiging wordt afgeslagen.');
    add(bid(2, 'NT'), 'game', 20, bid(3, 'NT'), { hcp: points(14) }, 'vanaf 14 punten, de uitnodiging wordt aangenomen.');
    add(bid(3, 'NT'), 'pass', 10, PASS, {}, 'de manche is geboden.');
  }

  // Partner answered 1NT
  const oneNoTrump = bid(1, 'NT');
  add(oneNoTrump, '3NT', 40, bid(3, 'NT'), { hcp: points(18), balanced: true }, 'vanaf 18 punten en verdeeld.');
  if (isMajor(opened)) {
    add(oneNoTrump, '6card-game', 35, bid(4, opened), { hcp: points(19), lengths: lengthOf(opened, 6) }, `vanaf 19 punten en minstens 6 ${openedName}.`);
  }
  add(oneNoTrump, '6card-jump', 30, bid(3, opened), { hcp: points(16), lengths: lengthOf(opened, 6) }, `vanaf 16 punten en minstens 6 ${openedName}.`);
  add(oneNoTrump, '6card', 30, bid(2, opened), { hcp: points(12, 15), lengths: lengthOf(opened, 6) }, `12 tot en met 15 punten en minstens 6 ${openedName}.`);
  secondSuits(oneNoTrump, suitsBelow(opened), 2, 20, 12, 'new', 'een tweede kleur');
  add(oneNoTrump, 'game', 15, bid(3, 'NT'), { hcp: points(19) }, 'vanaf 19 punten, genoeg voor de manche.');
  add(oneNoTrump, 'pass', 5, PASS, {}, 'geen reden om verder te bieden.');

  // Partner bid a new suit at the one level
  for (const partnerSuit of suitsAbove(opened)) {
    const response = bid(1, partnerSuit);
    const partnerName = SUIT_NAME[partnerSuit];
    const support = lengthOf(partnerSuit, 4);
    if (isMajor(partnerSuit)) {
      add(response, 'raise2', 60, bid(2, partnerSuit), { hcp: points(12, 15), lengths: support }, `12 tot en met 15 punten en minstens 4 ${partnerName} mee.`);
      add(response, 'raise3', 60, bid(3, partnerSuit), { hcp: points(16, 18), lengths: support }, `16 tot en met 18 punten en minstens 4 ${partnerName} mee.`);
      add(response, 'raise4', 60, bid(4, partnerSuit), { hcp: points(19), lengths: support }, `vanaf 19 punten en minstens 4 ${partnerName} mee.`);
    } else {
      add(response, 'raise2', 45, bid(2, partnerSuit), { hcp: points(12, 15), lengths: support }, `12 tot en met 15 punten en minstens 4 ${partnerName} mee.`);
      add(response, 'raise3', 45, bid(3, partnerSuit), { hcp: points(16), lengths: support }, `vanaf 16 punten en minstens 4 ${partnerName} mee.`);
    }
    secondSuits(response, suitsAbove(partnerSuit), 1, 50, 12, 'new', 'een nieuwe kleur op 1-niveau');
    add(response, '2NT', 40, bid(2, 'NT'), { hcp: points(18), balanced: true }, '18 of 19 punten en verdeeld.');
    add(response, '1NT', 40, bid(1, 'NT'), { hcp: points(12, 14), balanced: true }, '12 tot en met 14 punten en verdeeld.');
    add(response, '6card-jump', 30, bid(3, opened), { hcp: points(16), lengths: lengthOf(opened, 6) }, `vanaf 16 punten en minstens 6 ${openedName}.`);
    add(response, '6card', 30, bid(2, opened), { hcp: points(12, 15), lengths: lengthOf(opened, 6) }, `12 tot en met 15 punten en minstens 6 ${openedName}.`);
    secondSuits(response, suitsBelow(opened), 2, 25, 12, 'new', 'een tweede kleur');
    const between = suitsAbove(opened).filter((suit) => suitsBelow(partnerSuit).includes(suit));
    secondSuits(response, between, 2, 22, 16, 'reverse', 'vanaf 16 punten en een hogere tweede kleur');
    add(response, '5card', 10, bid(2, opened), { lengths: lengthOf(opened, 5) }, `herhaling van de openingskleur: minstens 5 ${openedName}.`);
  }

  // Partner bid a new suit at the two level
  for (const partnerSuit of suitsBelow(opened)) {
    const response = bid(2, partnerSuit);
    const partnerName = SUIT_NAME[partnerSuit];
    if (partnerSuit === 'H') {
      const support = lengthOf(partnerSuit, 3);
      add(response, 'raise3', 60, bid(3, partnerSuit), { hcp: points(12, 14), lengths: support }, `12 tot en met 14 punten en minstens 3 ${partnerName} mee.`);
      add(response, 'raise4', 60, bid(4, partnerSuit), { hcp: points(15), lengths: support }, `vanaf 15 punten en minstens 3 ${partnerName} mee.`);
    } else {
      add(response, 'raise3', 35, bid(3, partnerSuit), { hcp: points(12), lengths: lengthOf(partnerSuit, 4) }, `vanaf 12 punten en minstens 4 ${partnerName} mee.`);
    }
    add(response, '3NT', 40, bid(3, 'NT'), { hcp: points(18), balanced: true }, 'vanaf 18 punten en verdeeld.');
    add(response, '2NT', 40, bid(2, 'NT'), { hcp: points(12, 14), balanced: true }, '12 tot en met 14 punten en verdeeld.');
    add(response, '6card-jump', 30, bid(3, opened), { hcp: points(15), lengths: lengthOf(opened, 6) }, `vanaf 15 punten en minstens 6 ${openedName}.`);
    add(response, '6card', 30, bid(2, opened), { hcp: points(12, 14), lengths: lengthOf(opened, 6) }, `12 tot en met 14 punten en minstens 6 ${openedName}.`);
    const between = suitsAbove(partnerSuit).filter((suit) => suitsBelow(opened).includes(suit));
    secondSuits(response, between, 2, 25, 12, 'new', 'een tweede kleur');
    secondSuits(response, suitsAbove(opened), 2, 22, 15, 'reverse', 'vanaf 15 punten en een hogere tweede kleur');
    add(response, 'repeat', 5, bid(2, opened), {}, 'herhaling van de openingskleur: een minimum zonder ander passend bod.');
  }

  return rules;
}

export const REBID_RULES: readonly BiddingRule[] = SUITS.flatMap(rebidsAfter);
```

- [ ] **Step 4: Draai de tests en de typecontrole**

Run: `npm test -- src/bidding && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/bidding/rules/rebid.ts src/bidding/rules/rebid.test.ts
git commit -m "Add rules for the opener's rebid"
```

---

### Task 8: Alle regels bij elkaar en wat een speler heeft beloofd

**Files:**
- Create: `src/bidding/rules/index.ts`, `src/bidding/inference.ts`
- Test: `src/bidding/rules/index.test.ts`, `src/bidding/inference.test.ts`

**Interfaces:**
- Consumes:
  - uit `'../core'` / `'../../core'`: `Auction`, `SUITS`, `Seat`, `Suit`, `callerAt(auction, index)`, `sameCall(a, b)`, `auctionFrom(dealer, text)` (alleen in de test)
  - uit `./rules/opening`: `OPENING_RULES`; uit `./rules/notrump`: `NOTRUMP_RULES`; uit `./rules/response`: `RESPONSE_RULES`; uit `./rules/rebid`: `REBID_RULES`
  - uit `./rule`: `BiddingRule`; uit `./view`: `viewOf(auction)`; uit `./labels`: `callLabel(call)` (alleen in de test)
- Produces:
  - `ALL_RULES: readonly BiddingRule[]` (openingen, 1SA, antwoorden, herbiedingen, in die volgorde)
  - `interface Shown { readonly minHcp: number; readonly maxHcp: number; readonly minLength: Readonly<Record<Suit, number>> }`
  - `shownBy(rules: readonly BiddingRule[], auction: Auction, seat: Seat, maxLesson?: number): Shown`
    Wat `seat` met zijn biedingen tot nu toe heeft beloofd. Voor elk bod van die speler worden de regels gezocht met hetzelfde bod waarvan de situatie op dat moment paste. Uit die regels volgt het laagste minimum en het hoogste maximum aan punten en de kleinste minimumlengte per kleur; de biedingen samen geven de doorsnede. Een bod zonder passende regel zegt niets. Zonder informatie is het resultaat 0 tot 40 punten en lengte 0 in elke kleur. De `also`-voorwaarde van een regel telt niet mee.

- [ ] **Step 1: Schrijf de falende tests**

`src/bidding/rules/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { callLabel } from '../labels';
import { ALL_RULES } from './index';

describe('ALL_RULES', () => {
  it('has unique ids', () => {
    const ids = ALL_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers lessons 4 to 7', () => {
    expect([...new Set(ALL_RULES.map((rule) => rule.lesson))].sort()).toEqual([4, 5, 6, 7]);
  });

  it('starts every explanation with the call', () => {
    for (const rule of ALL_RULES) {
      expect(rule.explanation.startsWith(`${callLabel(rule.call)}: `)).toBe(true);
      expect(rule.explanation.endsWith('.')).toBe(true);
    }
  });
});
```

`src/bidding/inference.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { auctionFrom } from '../core';
import { shownBy } from './inference';
import { ALL_RULES } from './rules';

const shown = (auction: string, seat: 'N' | 'E' | 'S' | 'W', maxLesson?: number) =>
  shownBy(ALL_RULES, auctionFrom('N', auction), seat, maxLesson);

const NOTHING = { minHcp: 0, maxHcp: 40, minLength: { C: 0, D: 0, H: 0, S: 0 } };

describe('shownBy', () => {
  it('knows nothing about a player who has not called', () => {
    expect(shown('', 'N')).toEqual(NOTHING);
    expect(shown('1H', 'S')).toEqual(NOTHING);
  });

  it('reads an opening bid', () => {
    expect(shown('1H P', 'N')).toEqual({
      minHcp: 12,
      maxHcp: 40,
      minLength: { C: 0, D: 0, H: 5, S: 0 },
    });
    expect(shown('1NT P', 'N')).toMatchObject({ minHcp: 15, maxHcp: 17 });
    expect(shown('1C P', 'N').minLength.C).toBe(2);
  });

  it('reads an opening pass', () => {
    expect(shown('P 1H', 'N')).toMatchObject({ minHcp: 0, maxHcp: 11 });
  });

  it('reads a response', () => {
    expect(shown('1H P 2H P', 'S')).toEqual({
      minHcp: 6,
      maxHcp: 9,
      minLength: { C: 0, D: 0, H: 3, S: 0 },
    });
    expect(shown('1H P 1S P', 'S')).toMatchObject({ minHcp: 6, maxHcp: 40 });
    expect(shown('1H P 1S P', 'S').minLength.S).toBe(4);
  });

  it('combines the opening and the rebid', () => {
    expect(shown('1D P 1H P 1NT P', 'N')).toMatchObject({ minHcp: 12, maxHcp: 14 });
    expect(shown('1H P 2H P 3H P', 'N')).toMatchObject({ minHcp: 16, maxHcp: 18 });
    expect(shown('1H P 1S P 2C P', 'N').minLength).toEqual({ C: 4, D: 0, H: 5, S: 0 });
  });

  it('learns nothing from a call without a matching rule', () => {
    expect(shown('1H P 3C P', 'S')).toEqual(NOTHING);
    expect(shown('1H 1S', 'E')).toEqual(NOTHING);
  });

  it('ignores rules from later lessons', () => {
    expect(shown('1NT P', 'N', 4)).toEqual(NOTHING);
  });
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npm test -- src/bidding/rules/index.test.ts src/bidding/inference.test.ts`
Expected: FAIL, `./index` en `./inference` kunnen niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/bidding/rules/index.ts`:

```ts
import { type BiddingRule } from '../rule';
import { NOTRUMP_RULES } from './notrump';
import { OPENING_RULES } from './opening';
import { REBID_RULES } from './rebid';
import { RESPONSE_RULES } from './response';

export const ALL_RULES: readonly BiddingRule[] = [
  ...OPENING_RULES,
  ...NOTRUMP_RULES,
  ...RESPONSE_RULES,
  ...REBID_RULES,
];
```

`src/bidding/inference.ts`:

```ts
import { type Auction, SUITS, type Seat, type Suit, callerAt, sameCall } from '../core';
import { type BiddingRule } from './rule';
import { viewOf } from './view';

export interface Shown {
  readonly minHcp: number;
  readonly maxHcp: number;
  readonly minLength: Readonly<Record<Suit, number>>;
}

export function shownBy(
  rules: readonly BiddingRule[],
  auction: Auction,
  seat: Seat,
  maxLesson = Infinity,
): Shown {
  let minHcp = 0;
  let maxHcp = 40;
  const minLength: Record<Suit, number> = { C: 0, D: 0, H: 0, S: 0 };

  auction.calls.forEach((call, index) => {
    if (callerAt(auction, index) !== seat) return;
    const before = viewOf({ dealer: auction.dealer, calls: auction.calls.slice(0, index) });
    const meanings = rules.filter(
      (rule) => rule.lesson <= maxLesson && sameCall(rule.call, call) && rule.situation(before),
    );
    if (meanings.length === 0) return;

    minHcp = Math.max(minHcp, Math.min(...meanings.map((rule) => rule.requires.hcp?.[0] ?? 0)));
    maxHcp = Math.min(maxHcp, Math.max(...meanings.map((rule) => rule.requires.hcp?.[1] ?? 40)));
    for (const suit of SUITS) {
      const promised = Math.min(...meanings.map((rule) => rule.requires.lengths?.[suit]?.[0] ?? 0));
      minLength[suit] = Math.max(minLength[suit], promised);
    }
  });

  return { minHcp, maxHcp, minLength };
}
```

- [ ] **Step 4: Draai de tests en de typecontrole**

Run: `npm test -- src/bidding && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/bidding/rules/index.ts src/bidding/rules/index.test.ts src/bidding/inference.ts src/bidding/inference.test.ts
git commit -m "Add the full rule table and inference of what a player has shown"
```

---

### Task 9: Het vangnet en de biedfunctie

**Files:**
- Create: `src/bidding/fallback.ts`, `src/bidding/engine.ts`
- Test: `src/bidding/fallback.test.ts`, `src/bidding/engine.test.ts`

**Interfaces:**
- Consumes:
  - uit `'../core'`: `Auction`, `Bid`, `Call`, `Hand`, `PASS`, `SUITS`, `bid(level, strain)`, `callerAt`, `isAuctionComplete(auction)`, `isLegalCall(auction, call)`, `partnerOf(seat)`, `sameCall(a, b)`, `sideOf(seat)`, `auctionFrom`, `parseHand`, `callText` (de laatste drie alleen in tests)
  - uit `./evaluate`: `handFacts(hand)`; uit `./inference`: `shownBy(rules, auction, seat, maxLesson?)`; uit `./rule`: `BiddingRule`, `selectRule(rules, hand, auction, maxLesson?)`; uit `./rules`: `ALL_RULES`; uit `./view`: `viewOf(auction)`
- Produces:
  - `NO_AGREEMENT = 'Geen specifieke afspraak.'`
  - `interface Choice { readonly call: Call; readonly ruleId: string; readonly explanation: string }`
  - `fallbackChoice(rules: readonly BiddingRule[], hand: Hand, auction: Auction, maxLesson?: number): Choice`
  - `interface BiddingOptions { readonly maxLesson?: number; readonly rules?: readonly BiddingRule[] }`
  - `chooseCall(hand: Hand, auction: Auction, options?: BiddingOptions): Choice` (gooit een fout als het bieden al is afgelopen)
  - `explainCall(auction: Auction, index: number, options?: BiddingOptions): string`
    De uitleg van het bod op positie `index` volgens de regel met de hoogste prioriteit die dat bod in die situatie voorschrijft; `NO_AGREEMENT` als er geen is.

Het vangnet beslist in deze volgorde:

1. Hebben de tegenstanders geboden of gedoubleerd, of heeft de eigen partij nog niets geboden: pas (`fallback-pass`, uitleg `NO_AGREEMENT`).
2. Is het laatste bod van de eigen partij al een manche (3SA of hoger in SA, 4 of hoger in harten of schoppen, 5 of hoger in klaveren of ruiten): pas.
3. Tellen de eigen punten plus het minimum dat partner heeft beloofd op tot 25 of meer: bied de manche (`fallback-game`). Dat is 4♠ of 4♥ als de eigen lengte plus partners beloofde lengte in die kleur 8 of meer is (schoppen eerst), anders 3SA. Is dat bod niet geldig: pas.
4. Heeft partner twee verschillende kleuren geboden en is zijn laatste bod de tweede kleur, en heb ik in zijn eerste kleur minstens zoveel kaarten als in de tweede: bied zijn eerste kleur op het laagst mogelijke niveau (`fallback-preference`).
5. Anders: pas.

- [ ] **Step 1: Schrijf de falende tests**

`src/bidding/fallback.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { auctionFrom, callText, parseHand } from '../core';
import { NO_AGREEMENT, fallbackChoice } from './fallback';
import { ALL_RULES } from './rules';

const fallback = (hand: string, auction: string) =>
  fallbackChoice(ALL_RULES, parseHand(hand), auctionFrom('N', auction));
const call = (hand: string, auction: string) => callText(fallback(hand, auction).call);

describe('fallbackChoice', () => {
  it('passes when the opponents have bid', () => {
    const choice = fallback('KJ52.73.Q842.862', '1H 1S');
    expect(callText(choice.call)).toBe('P');
    expect(choice.ruleId).toBe('fallback-pass');
    expect(choice.explanation).toBe(NO_AGREEMENT);
  });

  it('passes when the partnership has not bid', () => {
    expect(call('AKJ52.Q73.K4.862', 'P 1H')).toBe('P');
  });

  it('passes when game has been reached', () => {
    expect(call('AKJ52.Q73.K.A862', '1S P 4S P')).toBe('P');
    expect(call('K42.Q73.AJ5.KQ62', '1NT P 3NT P')).toBe('P');
  });

  it('bids 3NT with 25 points together and no major fit', () => {
    const choice = fallback('K52.AQ73.J84.K62', '1D P 1H P 1NT P'); // 13 opposite 12-14
    expect(callText(choice.call)).toBe('3NT');
    expect(choice.ruleId).toBe('fallback-game');
    expect(choice.explanation).toBe('3SA: samen minstens 25 punten, genoeg voor de manche.');
  });

  it('bids four of a major with 25 points together and an eight-card fit', () => {
    expect(call('KQ852.K73.A84.Q2', '1H P 1S P 2H P')).toBe('4H'); // 14 opposite 12+, 3+5 hearts
  });

  it('passes with too little for game', () => {
    expect(call('K52.QJ73.J84.862', '1D P 1H P 1NT P')).toBe('P'); // 7 opposite 12-14
    expect(call('K52.Q73.J842.862', '1H P 2H P 3H P')).toBe('P'); // 6 opposite 16-18
  });

  it('accepts an invitation with a maximum', () => {
    expect(call('K52.Q73.KJ42.862', '1H P 2H P 3H P')).toBe('4H'); // 9 opposite 16-18
  });

  it('gives preference to the first suit of partner', () => {
    const choice = fallback('KJ852.73.Q842.86', '1H P 1S P 2C P');
    expect(callText(choice.call)).toBe('2H');
    expect(choice.ruleId).toBe('fallback-preference');
    expect(choice.explanation).toBe('2♥: voorkeur voor de eerste kleur van partner.');
  });

  it('passes with more cards in the second suit of partner', () => {
    expect(call('KJ852.7.Q84.8762', '1H P 1S P 2C P')).toBe('P');
  });
});
```

`src/bidding/engine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { auctionFrom, callText, parseHand } from '../core';
import { type BiddingOptions, chooseCall, explainCall } from './engine';
import { NO_AGREEMENT } from './fallback';

const choose = (hand: string, auction: string, options?: BiddingOptions) =>
  chooseCall(parseHand(hand), auctionFrom('N', auction), options);

describe('chooseCall', () => {
  it('returns the call, the rule and the explanation', () => {
    const choice = choose('K73.AQJ52.84.K62', '');
    expect(callText(choice.call)).toBe('1H');
    expect(choice.ruleId).toBe('open-1H');
    expect(choice.explanation).toBe('1♥: vanaf 12 punten en minstens 5 harten.');
  });

  it('uses the whole rule table', () => {
    expect(choose('K42.Q73.AJ5.KQ62', '').ruleId).toBe('open-1NT');
    expect(choose('K52.Q73.A842.Q62', '1NT P').ruleId).toBe('nt-resp-3NT');
    expect(choose('K52.Q73.J842.862', '1H P').ruleId).toBe('resp-raise2-H');
    expect(choose('K73.AQJ52.A.K962', '1H P 2H P').ruleId).toBe('rebid-1H-2H-invite');
  });

  it('respects the lesson limit', () => {
    expect(choose('K42.Q73.AJ5.KQ62', '', { maxLesson: 4 }).ruleId).toBe('open-1C');
    expect(choose('K52.Q73.J842.862', '1H P', { maxLesson: 5 }).ruleId).toBe('fallback-pass');
    expect(choose('K73.AQJ52.84.K62', '', { maxLesson: 3 }).ruleId).toBe('fallback-pass');
  });

  it('falls back when no rule applies', () => {
    const choice = choose('K52.AQ73.J84.K62', '1D P 1H P 1NT P');
    expect(callText(choice.call)).toBe('3NT');
    expect(choice.ruleId).toBe('fallback-game');
  });

  it('accepts a custom rule list', () => {
    expect(choose('K73.AQJ52.84.K62', '', { rules: [] }).ruleId).toBe('fallback-pass');
  });

  it('refuses a finished auction', () => {
    expect(() => choose('K73.AQJ52.84.K62', 'P P P P')).toThrow();
  });
});

describe('explainCall', () => {
  const auction = auctionFrom('N', '1H P 2H P');

  it('explains a call by its rule', () => {
    expect(explainCall(auction, 0)).toBe('1♥: vanaf 12 punten en minstens 5 harten.');
    expect(explainCall(auction, 2)).toBe('2♥: 6 tot en met 9 punten en minstens 3 harten mee.');
  });

  it('has no explanation for a call outside the rules', () => {
    expect(explainCall(auction, 1)).toBe(NO_AGREEMENT);
    expect(explainCall(auctionFrom('N', '1H P 3C P'), 2)).toBe(NO_AGREEMENT);
  });

  it('respects the lesson limit', () => {
    expect(explainCall(auction, 2, { maxLesson: 5 })).toBe(NO_AGREEMENT);
  });
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npm test -- src/bidding/fallback.test.ts src/bidding/engine.test.ts`
Expected: FAIL, `./fallback` en `./engine` kunnen niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/bidding/fallback.ts`:

```ts
import {
  type Auction,
  type Bid,
  type Call,
  type Hand,
  PASS,
  SUITS,
  bid,
  isLegalCall,
  partnerOf,
} from '../core';
import { handFacts } from './evaluate';
import { shownBy } from './inference';
import { callLabel } from './labels';
import { type BiddingRule } from './rule';
import { viewOf } from './view';

export const NO_AGREEMENT = 'Geen specifieke afspraak.';

export interface Choice {
  readonly call: Call;
  readonly ruleId: string;
  readonly explanation: string;
}

const PASS_CHOICE: Choice = { call: PASS, ruleId: 'fallback-pass', explanation: NO_AGREEMENT };
const GAME_POINTS = 25;
const FIT_LENGTH = 8;

function isGame(contract: Bid): boolean {
  if (contract.strain === 'NT') return contract.level >= 3;
  if (contract.strain === 'H' || contract.strain === 'S') return contract.level >= 4;
  return contract.level >= 5;
}

export function fallbackChoice(
  rules: readonly BiddingRule[],
  hand: Hand,
  auction: Auction,
  maxLesson = Infinity,
): Choice {
  const view = viewOf(auction);
  // With silent opponents the partner made the partnership's latest bid
  const contract = view.partnerBids.at(-1);
  if (!view.opponentsSilent || !contract || isGame(contract)) return PASS_CHOICE;

  const facts = handFacts(hand);
  const partner = shownBy(rules, auction, partnerOf(view.seat), maxLesson);

  if (facts.hcp + partner.minHcp >= GAME_POINTS) {
    const fit = (['S', 'H'] as const).find(
      (major) => facts.lengths[major] + partner.minLength[major] >= FIT_LENGTH,
    );
    const game = fit ? bid(4, fit) : bid(3, 'NT');
    if (!isLegalCall(auction, game)) return PASS_CHOICE;
    return {
      call: game,
      ruleId: 'fallback-game',
      explanation: `${callLabel(game)}: samen minstens 25 punten, genoeg voor de manche.`,
    };
  }

  const first = view.partnerBids[0];
  if (
    contract.strain !== 'NT' &&
    first.strain !== 'NT' &&
    first.strain !== contract.strain &&
    facts.lengths[first.strain] >= facts.lengths[contract.strain]
  ) {
    const higher = SUITS.indexOf(first.strain) > SUITS.indexOf(contract.strain);
    const level = higher ? contract.level : contract.level + 1;
    if (level <= 7) {
      const preference = bid(level as Bid['level'], first.strain);
      if (isLegalCall(auction, preference)) {
        return {
          call: preference,
          ruleId: 'fallback-preference',
          explanation: `${callLabel(preference)}: voorkeur voor de eerste kleur van partner.`,
        };
      }
    }
  }

  return PASS_CHOICE;
}
```

`src/bidding/engine.ts`:

```ts
import { type Auction, type Hand, isAuctionComplete, sameCall } from '../core';
import { type Choice, NO_AGREEMENT, fallbackChoice } from './fallback';
import { type BiddingRule, selectRule } from './rule';
import { ALL_RULES } from './rules';
import { viewOf } from './view';

export interface BiddingOptions {
  readonly maxLesson?: number;
  readonly rules?: readonly BiddingRule[];
}

export function chooseCall(hand: Hand, auction: Auction, options: BiddingOptions = {}): Choice {
  if (isAuctionComplete(auction)) {
    throw new Error('Auction is complete');
  }
  const rules = options.rules ?? ALL_RULES;
  const maxLesson = options.maxLesson ?? Infinity;
  const chosen = selectRule(rules, hand, auction, maxLesson);
  if (chosen) {
    return { call: chosen.call, ruleId: chosen.id, explanation: chosen.explanation };
  }
  return fallbackChoice(rules, hand, auction, maxLesson);
}

export function explainCall(auction: Auction, index: number, options: BiddingOptions = {}): string {
  const rules = options.rules ?? ALL_RULES;
  const maxLesson = options.maxLesson ?? Infinity;
  const call = auction.calls[index];
  const before = viewOf({ dealer: auction.dealer, calls: auction.calls.slice(0, index) });
  let best: BiddingRule | null = null;
  for (const candidate of rules) {
    if (candidate.lesson > maxLesson) continue;
    if (best && candidate.priority <= best.priority) continue;
    if (!sameCall(candidate.call, call) || !candidate.situation(before)) continue;
    best = candidate;
  }
  return best ? best.explanation : NO_AGREEMENT;
}
```

- [ ] **Step 4: Draai de tests en de typecontrole**

Run: `npm test -- src/bidding && npm run typecheck`
Expected: alle tests PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/bidding/fallback.ts src/bidding/fallback.test.ts src/bidding/engine.ts src/bidding/engine.test.ts
git commit -m "Add fallback bidding and the chooseCall engine"
```

---

### Task 10: Publieke export en volledige biedverlopen

**Files:**
- Create: `src/bidding/index.ts`
- Test: `src/bidding/game.test.ts`

**Interfaces:**
- Consumes:
  - uit `'../core'`: `SEATS`, `Seat`, `addCall`, `callText`, `contractOf`, `dealCards`, `dealerForBoard`, `isAuctionComplete`, `newAuction`, `parseHand`, `seatToCall`, `seededRng`, `Hand`
  - via `./index`: `chooseCall(hand, auction, options?)`, `viewOf(auction)`
- Produces:
  - `src/bidding/index.ts`: het enige importpunt voor latere modules. Exporteert alles uit `evaluate`, `labels`, `view`, `rule`, `inference`, `fallback`, `engine` en `ALL_RULES` uit `rules`. `testing.ts` en de afzonderlijke regellijsten worden niet geëxporteerd.

- [ ] **Step 1: Schrijf de falende test**

`src/bidding/game.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  type Hand,
  SEATS,
  type Seat,
  addCall,
  callText,
  contractOf,
  dealCards,
  dealerForBoard,
  isAuctionComplete,
  newAuction,
  parseHand,
  seatToCall,
  seededRng,
} from '../core';
import { chooseCall, viewOf } from './index';

interface Step {
  readonly ruleId: string;
  readonly early: boolean;
}

// Lets all four hands bid until the auction ends
function bidOut(hands: Record<Seat, Hand>, dealer: Seat, maxLesson = 7) {
  let auction = newAuction(dealer);
  const steps: Step[] = [];
  while (!isAuctionComplete(auction)) {
    if (auction.calls.length > 60) throw new Error('Auction does not end');
    const view = viewOf(auction);
    const choice = chooseCall(hands[seatToCall(auction)], auction, { maxLesson });
    // Opening, response and opener's rebid: at most one earlier bid by each partner
    steps.push({
      ruleId: choice.ruleId,
      early: view.opponentsSilent && view.myBids.length <= 1 && view.partnerBids.length <= 1,
    });
    auction = addCall(auction, choice.call);
  }
  return { auction, steps, text: auction.calls.map(callText).join(' ') };
}

const WEAK_EAST = 'T98.J64.T73.T973';
const WEAK_WEST = '764.T95.986.J854';

function auctionFor(north: string, south: string, maxLesson = 7): string {
  const hands = {
    N: parseHand(north),
    E: parseHand(WEAK_EAST),
    S: parseHand(south),
    W: parseHand(WEAK_WEST),
  };
  return bidOut(hands, 'N', maxLesson).text;
}

describe('complete auctions', () => {
  it('stops in a part score after a declined invitation', () => {
    expect(auctionFor('AKJ52.Q73.K4.862', 'Q73.K52.A862.J54')).toBe('1S P 3S P P P');
  });

  it('bids game opposite 1NT', () => {
    expect(auctionFor('K42.Q73.AJ5.KQ62', 'K52.Q73.A842.Q62')).toBe('1NT P 3NT P P P');
  });

  it('accepts an invitation with a maximum', () => {
    expect(auctionFor('K73.AQJ52.A.K962', 'K52.Q73.KJ42.862')).toBe('1H P 2H P 3H P 4H P P P');
  });

  it('declines an invitation with a minimum', () => {
    expect(auctionFor('K73.AQJ52.A.K962', 'K52.Q73.J842.862')).toBe('1H P 2H P 3H P P P');
  });

  it('passes the board out without an opening hand', () => {
    expect(auctionFor('Q8642.K73.84.K62', 'K52.Q73.J842.862')).toBe('P P P P');
  });

  it('only opens in lesson 4', () => {
    expect(auctionFor('K42.Q73.AJ5.KQ62', 'K52.Q73.A842.Q62', 4)).toBe('1C P P P');
  });
});

describe('random deals', () => {
  const results = Array.from({ length: 300 }, (_, i) => {
    const seed = i + 1;
    const deal = dealCards(seededRng(seed));
    return { seed, ...bidOut(deal, dealerForBoard(seed)) };
  });

  it('always ends with a legal auction', () => {
    for (const { auction } of results) {
      expect(isAuctionComplete(auction)).toBe(true);
    }
  });

  it('never needs the fallback for an opening, a response or the opener rebid', () => {
    const gaps = results.flatMap(({ seed, steps }) =>
      steps
        .filter((step) => step.early && step.ruleId.startsWith('fallback'))
        .map((step) => `seed ${seed}: ${step.ruleId}`),
    );
    expect(gaps).toEqual([]);
  });

  it('reaches part scores, games and passed-out boards', () => {
    const contracts = results.map(({ auction }) => contractOf(auction));
    const passedOut = contracts.filter((contract) => contract === null).length;
    const games = contracts.filter(
      (contract) =>
        contract !== null &&
        (contract.level >= 5 ||
          (contract.level === 4 && (contract.strain === 'H' || contract.strain === 'S')) ||
          (contract.level >= 3 && contract.strain === 'NT')),
    ).length;
    expect(passedOut).toBeGreaterThan(0);
    expect(passedOut).toBeLessThan(150);
    expect(games).toBeGreaterThan(30);
    expect(games).toBeLessThan(200);
  });

  it('keeps the opponents of the opener silent', () => {
    for (const { auction } of results) {
      const contract = contractOf(auction);
      if (!contract) continue;
      const declaringSide = contract.declarer === 'N' || contract.declarer === 'S' ? 'NS' : 'EW';
      auction.calls.forEach((call, index) => {
        const seat = SEATS[(SEATS.indexOf(auction.dealer) + index) % 4];
        const side = seat === 'N' || seat === 'S' ? 'NS' : 'EW';
        if (side !== declaringSide) expect(call.type).toBe('pass');
      });
    }
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- src/bidding/game.test.ts`
Expected: FAIL, `./index` kan niet worden gevonden.

- [ ] **Step 3: Schrijf de implementatie**

`src/bidding/index.ts`:

```ts
export * from './evaluate';
export * from './labels';
export * from './view';
export * from './rule';
export * from './inference';
export * from './fallback';
export * from './engine';
export { ALL_RULES } from './rules';
```

- [ ] **Step 4: Draai alle tests en de typecontrole**

Run: `npm test && npm run typecheck`
Expected: alle testbestanden PASS, typecontrole zonder fouten.

- [ ] **Step 5: Commit**

```bash
git add src/bidding/index.ts src/bidding/game.test.ts
git commit -m "Add bidding index and full auction integration test"
```
