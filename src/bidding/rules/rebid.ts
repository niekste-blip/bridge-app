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
