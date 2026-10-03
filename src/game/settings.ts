import { type Level } from '../bots';

export type TextSize = 'normal' | 'large' | 'extraLarge';

export interface Settings {
  // Level of the two opponents; the partner always plays at the hard level
  readonly level: Level;
  // When false the bots bid all four hands and the user only plays the contract
  readonly userBids: boolean;
  readonly showPoints: boolean;
  readonly textSize: TextSize;
  // Highest lesson the user has finished; the bots use no bidding rules beyond it
  readonly progressLesson: number;
  // Opens every lesson and lets the bots use all rules, for someone who already plays
  readonly unlockAll: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  level: 'easy',
  userBids: true,
  showPoints: true,
  textSize: 'large',
  progressLesson: 0,
  unlockAll: false,
};

const LAST_LESSON = 13;

// The lesson the user counts as having reached
export function effectiveProgress(settings: Settings): number {
  return settings.unlockAll ? LAST_LESSON : settings.progressLesson;
}
