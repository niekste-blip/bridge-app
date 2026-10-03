import { describe, expect, it } from 'vitest';
import {
  PASS,
  SEATS,
  bid,
  callText,
  cardId,
  dummyOf,
  legalCards,
  scoreContract,
  sideOf,
  tricksWon,
} from '../core';
import {
  type Game,
  botCallIn,
  botCardIn,
  canUndo,
  handOf,
  newGame,
  phaseOf,
  resultOf,
  turnOf,
  undoMove,
  userCall,
  userCard,
  visibleSeats,
} from './game';

const note = (text: string) => ({
  call: PASS,
  ruleId: 'test',
  explanation: text,
  source: 'rule' as const,
});

// Board 1: North deals. Everybody passes except the given seat, which bids the given contract.
function bidTo(game: Game, declarer: 'N' | 'S', contract = bid(1, 'NT')): Game {
  let current = game;
  while (phaseOf(current) === 'auction') {
    const turn = turnOf(current);
    const alreadyBid = current.auction.calls.some((call) => call.type === 'bid');
    const call = turn?.seat === declarer && !alreadyBid ? contract : PASS;
    current = turn?.byUser ? userCall(current, call) : botCallIn(current, { ...note('test'), call });
  }
  return current;
}

function playCards(game: Game, count: number): Game {
  let current = game;
  for (let i = 0; i < count; i++) {
    if (!current.play) throw new Error('not in play');
    const card = legalCards(current.play)[0];
    current = turnOf(current)?.byUser ? userCard(current, card) : botCardIn(current, card);
  }
  return current;
}

describe('newGame', () => {
  it('deals a board', () => {
    const game = newGame(2, 5);
    expect(game.dealer).toBe('E');
    expect(game.vulnerability).toBe('NS');
    for (const seat of SEATS) expect(game.deal[seat]).toHaveLength(13);
    expect(phaseOf(game)).toBe('auction');
  });

  it('deals the same cards for the same seed', () => {
    expect(newGame(1, 5).deal).toEqual(newGame(1, 5).deal);
    expect(newGame(1, 5).deal).not.toEqual(newGame(1, 6).deal);
  });
});

describe('the auction', () => {
  it('asks the dealer first and the user when South is to call', () => {
    const game = newGame(1, 1);
    expect(turnOf(game)).toEqual({ kind: 'call', seat: 'N', actor: 'N', byUser: false });
    const next = botCallIn(botCallIn(game, note('a')), note('b'));
    expect(turnOf(next)).toEqual({ kind: 'call', seat: 'S', actor: 'S', byUser: true });
  });

  it('keeps the explanation of every bot call', () => {
    let game = botCallIn(botCallIn(newGame(1, 1), note('eerste')), note('tweede'));
    game = userCall(game, bid(1, 'H'));
    expect(game.notes).toEqual(['eerste', 'tweede', null]);
    expect(game.auction.calls.map(callText)).toEqual(['P', 'P', '1H']);
  });

  it('ends passed out without a contract', () => {
    let game = newGame(1, 1);
    for (let i = 0; i < 4; i++) {
      game = turnOf(game)?.byUser ? userCall(game, PASS) : botCallIn(game, note('pas'));
    }
    expect(phaseOf(game)).toBe('passedOut');
    expect(game.contract).toBeNull();
    expect(turnOf(game)).toBeNull();
    expect(resultOf(game)).toBeNull();
  });

  it('starts the play when the auction ends', () => {
    const game = bidTo(newGame(1, 1), 'S');
    expect(phaseOf(game)).toBe('play');
    expect(game.contract).toEqual({ level: 1, strain: 'NT', doubling: 'none', declarer: 'S' });
    expect(turnOf(game)).toEqual({ kind: 'card', seat: 'W', actor: 'W', byUser: false });
  });
});

describe('the play', () => {
  it('lets the user play the cards of dummy as declarer', () => {
    const game = playCards(bidTo(newGame(1, 1), 'S'), 1);
    expect(turnOf(game)).toEqual({ kind: 'card', seat: 'N', actor: 'S', byUser: true });
  });

  it('lets the partner play both hands when the user is dummy', () => {
    const game = bidTo(newGame(1, 1), 'N');
    expect(game.play && dummyOf(game.play)).toBe('S');
    const afterLead = playCards(game, 1);
    expect(turnOf(afterLead)).toEqual({ kind: 'card', seat: 'S', actor: 'N', byUser: false });
  });

  it('finishes after thirteen tricks with a score', () => {
    const game = playCards(bidTo(newGame(1, 1), 'S'), 52);
    expect(phaseOf(game)).toBe('finished');
    expect(turnOf(game)).toBeNull();
    const result = resultOf(game);
    if (!result || !game.play) throw new Error('expected a result');
    expect(result.declarerTricks).toBe(tricksWon(game.play, 'NS'));
    expect(result.difference).toBe(result.declarerTricks - 7);
    expect(result.declarerScore).toBe(scoreContract(result.contract, result.declarerTricks, 'none'));
    expect(result.userScore).toBe(result.declarerScore);
  });

  it('turns the score around when the opponents declare', () => {
    let game = newGame(1, 1);
    while (phaseOf(game) === 'auction') {
      const turn = turnOf(game);
      const call = turn?.seat === 'E' && game.auction.calls.length === 1 ? bid(1, 'NT') : PASS;
      game = turn?.byUser ? userCall(game, call) : botCallIn(game, { ...note('test'), call });
    }
    expect(game.contract?.declarer).toBe('E');
    const result = resultOf(playCards(game, 52));
    expect(result && sideOf(result.contract.declarer)).toBe('EW');
    expect(result?.userScore).toBe(-(result?.declarerScore ?? 0));
  });
});

describe('what the user may see', () => {
  it('shows only the own hand during the auction', () => {
    expect(visibleSeats(newGame(1, 1))).toEqual(['S']);
  });

  it('shows dummy after the opening lead', () => {
    const game = bidTo(newGame(1, 1), 'S');
    expect(visibleSeats(game)).toEqual(['S']);
    expect(visibleSeats(playCards(game, 1))).toEqual(['N', 'S']);
  });

  it('shows the hand of partner when the user is dummy', () => {
    expect(visibleSeats(bidTo(newGame(1, 1), 'N'))).toEqual(['N', 'S']);
  });

  it('shows all hands when the board is over', () => {
    expect(visibleSeats(playCards(bidTo(newGame(1, 1), 'S'), 52))).toEqual(['N', 'E', 'S', 'W']);
  });

  it('gives the cards a seat still holds', () => {
    const game = bidTo(newGame(1, 1), 'S');
    expect(handOf(newGame(1, 1), 'S')).toHaveLength(13);
    expect(handOf(playCards(game, 1), 'W')).toHaveLength(12);
  });
});

describe('taking back a move', () => {
  it('takes back a call, together with the bot calls after it', () => {
    const before = botCallIn(botCallIn(newGame(1, 1), note('a')), note('b'));
    const after = botCallIn(userCall(before, bid(1, 'H')), note('c'));
    expect(canUndo(before)).toBe(false);
    expect(canUndo(after)).toBe(true);
    expect(undoMove(after)).toEqual(before);
  });

  it('cannot take back the call that ends the auction', () => {
    const game = bidTo(newGame(1, 1), 'N');
    expect(canUndo(game)).toBe(false);
  });

  it('takes back a card while the trick is not complete', () => {
    const afterLead = playCards(bidTo(newGame(1, 1), 'S'), 1);
    const afterDummy = playCards(afterLead, 1);
    expect(canUndo(afterDummy)).toBe(true);
    const undone = undoMove(afterDummy);
    expect(undone.play?.current.cards.map(cardId)).toEqual(afterLead.play?.current.cards.map(cardId));
    expect(canUndo(undone)).toBe(false);
  });

  it('cannot take back a card once the trick is complete', () => {
    const game = playCards(bidTo(newGame(1, 1), 'S'), 4);
    expect(game.play?.completed).toHaveLength(1);
    expect(canUndo(game)).toBe(false);
    expect(undoMove(game)).toBe(game);
  });
});
