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
}

export const DEFAULT_SETTINGS: Settings = {
  level: 'easy',
  userBids: true,
  showPoints: true,
  textSize: 'large',
  progressLesson: 7,
};
