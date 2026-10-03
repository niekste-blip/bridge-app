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
