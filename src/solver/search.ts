// Double dummy search on a compact position: one 13-bit mask per seat and suit.
// Seats are 0..3 (N, E, S, W), suits 0..3 (C, D, H, S), trump 4 means no trump.
// All values count tricks for North-South.

export const NO_TRUMP = 4;
// About 40 MB per trump suit at most; the table is emptied when it is full
const MAX_ENTRIES = 200_000;

export class Search {
  readonly hands = new Int32Array(16);
  readonly trickSuit = new Int8Array(52);
  readonly trickRank = new Int8Array(52);
  private readonly table = new Map<string, number>();
  private readonly moveSuit = new Int8Array(52 * 13);
  private readonly moveRank = new Int8Array(52 * 13);
  private readonly moveScore = new Int16Array(52 * 13);

  constructor(readonly trump: number) {}

  // Exact number of tricks North-South take from here with best play by both sides
  nsTricks(leader: number, played: number, left: number): number {
    let low = 0;
    let high = left;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.canTake(leader, played, middle, left, 0)) low = middle;
      else high = middle - 1;
    }
    return low;
  }

  // Can North-South take at least `need` of the `left` tricks that are not finished yet?
  canTake(leader: number, played: number, need: number, left: number, base: number): boolean {
    if (need <= 0) return true;
    if (need > left) return false;

    let key = '';
    let bounds = left << 4;
    if (played === 0) {
      key = this.key(leader);
      const stored = this.table.get(key);
      if (stored !== undefined) {
        bounds = stored;
        if ((bounds & 15) >= need) return true;
        if (bounds >> 4 < need) return false;
      }
    }

    const seat = (leader + played) & 3;
    const northSouth = (seat & 1) === 0;
    if (played === 0) {
      const sure = this.sureTricks(leader);
      if (northSouth ? sure >= need : sure > left - need) {
        return northSouth;
      }
    }
    const first = (base + played) * 13;
    const count = this.generate(seat, played, base, first);
    let result = !northSouth;
    for (let i = 0; i < count; i++) {
      // Selection sort step: best remaining move first
      let best = i;
      for (let j = i + 1; j < count; j++) {
        if (this.moveScore[first + j] > this.moveScore[first + best]) best = j;
      }
      const suit = this.moveSuit[first + best];
      const rank = this.moveRank[first + best];
      this.moveSuit[first + best] = this.moveSuit[first + i];
      this.moveRank[first + best] = this.moveRank[first + i];
      this.moveScore[first + best] = this.moveScore[first + i];

      const bit = 1 << rank;
      this.hands[seat * 4 + suit] ^= bit;
      this.trickSuit[base + played] = suit;
      this.trickRank[base + played] = rank;
      let outcome: boolean;
      if (played === 3) {
        const winner = (leader + this.winnerIndex(base)) & 3;
        const won = (winner & 1) === 0 ? 1 : 0;
        outcome = this.canTake(winner, 0, need - won, left - 1, base + 4);
      } else {
        outcome = this.canTake(leader, played + 1, need, left, base);
      }
      this.hands[seat * 4 + suit] ^= bit;
      if (outcome === northSouth) {
        result = northSouth;
        break;
      }
    }

    if (played === 0) {
      if (this.table.size >= MAX_ENTRIES) this.table.clear();
      const low = bounds & 15;
      const high = bounds >> 4;
      this.table.set(key, result ? Math.max(low, need) | (high << 4) : low | (Math.min(high, need - 1) << 4));
    }
    return result;
  }

  // Tricks the leader can cash at once: cards that beat every other card of their suit.
  // In a trump contract side suits only count when the opponents have no trumps left.
  private sureTricks(leader: number): number {
    const hands = this.hands;
    const left = (leader + 1) & 3;
    const right = (leader + 3) & 3;
    const partner = (leader + 2) & 3;
    const trump = this.trump;
    const ruffRisk =
      trump !== NO_TRUMP && (hands[left * 4 + trump] | hands[right * 4 + trump]) !== 0;
    let sure = 0;
    for (let suit = 0; suit < 4; suit++) {
      if (ruffRisk && suit !== trump) continue;
      const mine = hands[leader * 4 + suit];
      if (mine === 0) continue;
      const others = hands[left * 4 + suit] | hands[right * 4 + suit] | hands[partner * 4 + suit];
      for (let rank = 12; rank >= 0; rank--) {
        const bit = 1 << rank;
        if (mine & bit) sure++;
        else if (others & bit) break;
      }
    }
    return sure;
  }

  // Index (0..3) within the trick starting at `base` of the card that wins it
  winnerIndex(base: number): number {
    let best = 0;
    for (let i = 1; i < 4; i++) {
      const suit = this.trickSuit[base + i];
      const bestSuit = this.trickSuit[base + best];
      if (suit === bestSuit) {
        if (this.trickRank[base + i] > this.trickRank[base + best]) best = i;
      } else if (suit === this.trump) {
        best = i;
      }
    }
    return best;
  }

  // Writes the moves of `seat` at `first`; one card per group of touching cards
  private generate(seat: number, played: number, base: number, first: number): number {
    let count = 0;
    const ledSuit = played > 0 ? this.trickSuit[base] : -1;
    const follows = ledSuit >= 0 && this.hands[seat * 4 + ledSuit] !== 0;

    // The card that is winning the trick so far
    let winning = -1;
    let winningSuit = -1;
    let winningRank = -1;
    for (let i = 0; i < played; i++) {
      const suit = this.trickSuit[base + i];
      const rank = this.trickRank[base + i];
      if (winning < 0 || (suit === winningSuit ? rank > winningRank : suit === this.trump)) {
        winning = i;
        winningSuit = suit;
        winningRank = rank;
      }
    }
    const partnerWinning = played >= 2 && winning === played - 2;

    for (let suit = 0; suit < 4; suit++) {
      if (follows && suit !== ledSuit) continue;
      const mine = this.hands[seat * 4 + suit];
      if (mine === 0) continue;
      let others = 0;
      for (let other = 0; other < 4; other++) {
        if (other !== seat) others |= this.hands[other * 4 + suit];
      }
      for (let i = 0; i < played; i++) {
        if (this.trickSuit[base + i] === suit) others |= 1 << this.trickRank[base + i];
      }
      let inRun = false;
      for (let rank = 12; rank >= 0; rank--) {
        const bit = 1 << rank;
        if ((mine & bit) === 0) {
          if (others & bit) inRun = false;
          continue;
        }
        if (inRun) continue;
        inRun = true;

        let score: number;
        if (played === 0) {
          // Lead: cards nobody can beat first, then low cards
          score = bit > others ? 40 + rank : 12 - rank;
          if (suit === this.trump) score += 1;
        } else {
          const beats =
            suit === winningSuit ? rank > winningRank : suit === this.trump;
          if (partnerWinning) score = 30 - rank - (beats ? 20 : 0);
          else if (beats) score = 60 - rank;
          else score = 30 - rank - (suit === this.trump ? 20 : 0);
        }
        this.moveSuit[first + count] = suit;
        this.moveRank[first + count] = rank;
        this.moveScore[first + count] = score;
        count++;
      }
    }
    return count;
  }

  // Positions with the same relative ranks share one entry
  private key(leader: number): string {
    const hands = this.hands;
    let key = String(leader);
    for (let suit = 0; suit < 4; suit++) {
      const north = hands[suit];
      const east = hands[4 + suit];
      const south = hands[8 + suit];
      let all = north | east | south | hands[12 + suit];
      let a = 0;
      let b = 0;
      let out = 1;
      while (all) {
        const bit = all & -all;
        all ^= bit;
        if (north & bit) a |= out;
        else if (east & bit) a |= out << 13;
        else if (south & bit) b |= out;
        else b |= out << 13;
        out <<= 1;
      }
      key += ',' + a + ',' + b;
    }
    return key;
  }
}
