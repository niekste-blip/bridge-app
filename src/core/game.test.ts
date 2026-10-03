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
