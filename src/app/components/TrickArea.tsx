import { type PlayState, SEATS, type Seat, type Trick, seatAfter } from '../../core';
import { SEAT_NAME } from '../text';
import { CardView } from './CardView';

// The trick to show: the one being played, or the last finished one until the next card falls
export function shownTrick(play: PlayState): Trick | null {
  if (play.current.cards.length > 0) return play.current;
  return play.completed[play.completed.length - 1] ?? null;
}

interface Props {
  readonly play: PlayState;
  readonly toPlay: Seat | null;
}

export function TrickArea({ play, toPlay }: Props) {
  const trick = shownTrick(play);
  return (
    <div className="trick">
      {SEATS.map((seat) => {
        const index = trick
          ? trick.cards.findIndex((_, position) => seatAfter(trick.leader, position) === seat)
          : -1;
        return (
          <div key={seat} className={`trick-seat trick-${seat}`}>
            {trick && index >= 0 ? (
              <CardView card={trick.cards[index]} />
            ) : (
              <span className={seat === toPlay ? 'trick-empty to-play' : 'trick-empty'}>
                {SEAT_NAME[seat]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
