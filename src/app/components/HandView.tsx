import { type Card, type Hand, type Suit, sameCard } from '../../core';
import { CardView } from './CardView';

// Black and red suits alternate, which keeps hearts and diamonds apart
const DISPLAY_ORDER: readonly Suit[] = ['S', 'H', 'C', 'D'];

interface Props {
  readonly hand: Hand;
  // Cards that may be played now; when absent the hand is only shown
  readonly playable?: readonly Card[];
  readonly selected?: Card | null;
  readonly small?: boolean;
  readonly onSelect?: (card: Card) => void;
}

export function HandView({ hand, playable, selected, small, onSelect }: Props) {
  const cards = DISPLAY_ORDER.flatMap((suit) => hand.filter((card) => card.suit === suit));
  return (
    <div className={small ? 'hand hand-small' : 'hand'}>
      {cards.map((card) => {
        const canPlay = playable?.some((other) => sameCard(other, card)) ?? false;
        return (
          <CardView
            key={card.suit + card.rank}
            card={card}
            small={small}
            selected={selected ? sameCard(selected, card) : false}
            disabled={playable !== undefined && !canPlay}
            onClick={playable && onSelect ? () => onSelect(card) : undefined}
          />
        );
      })}
    </div>
  );
}

export function HiddenHand({ count }: { readonly count: number }) {
  return (
    <div className="hidden-hand" aria-label={`${count} kaarten`}>
      <span className="card-back" />
      <span className="hidden-count">{count}</span>
    </div>
  );
}
