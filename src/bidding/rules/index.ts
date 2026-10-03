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
