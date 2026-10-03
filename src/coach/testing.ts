import { type Deal, auctionFrom, parseCard, playCard, startPlay } from '../core';
import { type Game } from '../game';

// Test helper: a finished four-card board in which South, the user, declares 1NT.
// West leads a club to South's ace. South then holds the two top spades and a small diamond;
// `secondTrick` chooses what South does with them.
export function fourCardBoard(secondTrick: 'cash' | 'blunder'): Game {
  const parse = (text: string) => text.split(' ').map(parseCard);
  const deal: Deal = {
    N: parse('C2 S3 S4 H2'),
    E: parse('C4 SJ DK H3'),
    S: parse('CA SA SK D2'),
    W: parse('C5 SQ DA D3'),
  };
  const auction = auctionFrom('N', 'P P 1NT P P P');
  const contract = { level: 1, strain: 'NT', doubling: 'none', declarer: 'S' } as const;
  const cards =
    secondTrick === 'blunder'
      ? 'C5 C2 C4 CA D2 DA S3 DK D3 S4 H3 SK SQ H2 SJ SA'
      : 'C5 C2 C4 CA SA SQ S3 SJ SK D3 S4 H3 D2 DA H2 DK';
  const play = cards.split(' ').reduce((state, id) => playCard(state, parseCard(id)), startPlay(deal, contract));
  return {
    board: 1,
    seed: 1,
    dealer: 'N',
    vulnerability: 'none',
    deal,
    auction,
    notes: ['Pas: test.', 'Pas: test.', null, 'Pas: test.', 'Pas: test.', 'Pas: test.'],
    contract,
    play,
    undo: null,
  };
}
