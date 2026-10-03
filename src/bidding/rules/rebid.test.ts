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

  it('shows a lower second suit with an unbalanced hand', () => {
    expect(rebid('1H P 1NT', 'K7.AQJ52.84.KJ62')).toBe('2C');
    expect(rebid('1D P 1NT', 'K52.Q4.AJ82.KJ62')).toBe('P'); // balanced: 1NT is fine
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
    expect(rebid('1H P 1S', 'AK3.AQJ52.KQ4.Q6')).toBe('3NT'); // 21
    expect(rebid('1C P 1D', 'KQ76.A64.KT.AQ84')).toBe('2NT'); // 18: before a new suit
  });

  it('bids game with 19 or more points and no better bid', () => {
    expect(rebid('1H P 1S', 'A4.AKQ52.3.AQJ62')).toBe('3NT'); // 20, five-five
    expect(rebid('1H P 1S', 'A4.AKQ852.K3.A62')).toBe('4H'); // 20, six hearts
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

  it('bids game with 15 or more points', () => {
    expect(rebid('1S P 2H', 'AKJ52.K4.A3.K862')).toBe('3NT'); // 18, no heart support
    expect(rebid('1S P 2D', 'KQT843.K.A954.AJ')).toBe('3S'); // 17, six spades
  });
});

describe('situation', () => {
  it('has no rule for the responder or after 1NT', () => {
    expect(callFor(REBID_RULES, 'KJ852.73.Q842.86', '1H P 1S P 2C P')).toBe('none');
    expect(callFor(REBID_RULES, 'K42.Q73.AJ5.KQ62', '1NT P 2NT P')).toBe('none');
  });
});
