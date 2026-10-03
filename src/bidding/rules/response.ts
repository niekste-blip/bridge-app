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
        'vanaf 12 punten, een SA-verdeling en geen 4-kaart harten of schoppen.',
      ),
      rule(
        `resp-2NT-${opened}`,
        LESSON,
        45,
        bid(2, 'NT'),
        situation,
        { hcp: points(10, 11), balanced: true, lengths: NO_FOUR_CARD_MAJOR },
        '10 of 11 punten, een SA-verdeling en geen 4-kaart harten of schoppen.',
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
        { hcp: points(10, 11), lengths: support },
        `10 of 11 punten en minstens ${supportLength} ${openedName} mee, geen 4-kaart harten of schoppen; uitnodiging voor de manche.`,
      ),
      rule(
        `resp-3NT-support-${opened}`,
        LESSON,
        30,
        bid(3, 'NT'),
        situation,
        { hcp: points(12), lengths: support },
        `vanaf 12 punten en minstens ${supportLength} ${openedName} mee, geen 4-kaart harten of schoppen; genoeg voor de manche.`,
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
