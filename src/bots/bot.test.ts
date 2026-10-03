import { describe, expect, it } from 'vitest';
import { auctionFrom, callText, cardId, parseHand, seededRng } from '../core';
import { chooseCall } from '../bidding';
import { botCall, botCard, lessonLimit } from './bot';
import { heuristicCard } from './heuristic';
import { hands, play, position, viewAt } from './testing';

describe('lessonLimit', () => {
  it('never drops below lesson 7', () => {
    expect(lessonLimit('easy', 4)).toBe(7);
    expect(lessonLimit('hard', 3)).toBe(7);
  });

  it('is capped by the level and by the progress of the student', () => {
    expect(lessonLimit('easy', 13)).toBe(7);
    expect(lessonLimit('medium', 13)).toBe(10);
    expect(lessonLimit('hard', 13)).toBe(13);
    expect(lessonLimit('hard', 8)).toBe(8);
  });
});

describe('botCall', () => {
  it('bids by the rule table', () => {
    const hand = parseHand('K73.AQJ52.84.K62');
    const auction = auctionFrom('N', '');
    const choice = botCall(hand, auction, 'easy', 4);
    expect(callText(choice.call)).toBe('1H');
    expect(choice).toEqual(chooseCall(hand, auction, { maxLesson: 7 }));
  });
});

describe('botCard', () => {
  // South leads in no trump: the ace of spades first is always at least as good as the two
  const lead = viewAt(position(hands('H2 H3', 'SK D2', 'SA S2', 'SQ D3'), 'NT', 'S', 'S'));

  it('plays the only legal card without thinking', () => {
    const forced = viewAt(play(position(hands('S5 H3', 'SK D2', 'SA S2', 'SQ D3'), 'NT', 'S', 'S'), 'SA', 'SQ'));
    const rng = () => {
      throw new Error('no random numbers needed');
    };
    expect(cardId(botCard(forced, 'hard', rng))).toBe('S5');
  });

  it('plays by rules of thumb on the easy level', () => {
    const tricky = viewAt(position(hands('H2 H3 C2', 'SK D2 C3', 'S2 S3 SA', 'SQ D3 C4'), 'NT', 'S', 'S'));
    expect(botCard(tricky, 'easy', seededRng(1))).toEqual(heuristicCard(tricky));
  });

  it('finds the best card by simulation on the hard level', () => {
    expect(cardId(botCard(lead, 'hard', seededRng(1)))).toBe('SA');
    expect(cardId(botCard(lead, 'medium', seededRng(2), { samples: 8 }))).toMatch(/^S[A2]$/);
  });

  it('plays by rules of thumb with too many cards in hand', () => {
    expect(botCard(lead, 'hard', seededRng(1), { maxCards: 1 })).toEqual(heuristicCard(lead));
  });

  it('gives the same card for the same random numbers', () => {
    expect(botCard(lead, 'medium', seededRng(9))).toEqual(botCard(lead, 'medium', seededRng(9)));
  });
});
