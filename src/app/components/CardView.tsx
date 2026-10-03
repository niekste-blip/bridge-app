import { type Card, rankLabel } from '../../core';
import { STRAIN_SYMBOL } from '../../bidding';
import { cardLabel } from '../text';

interface Props {
  readonly card: Card;
  readonly selected?: boolean;
  // A card that may not be played now is shown grey and cannot be tapped
  readonly disabled?: boolean;
  readonly small?: boolean;
  readonly onClick?: () => void;
}

export function CardView({ card, selected, disabled, small, onClick }: Props) {
  const red = card.suit === 'H' || card.suit === 'D';
  const classes = ['card', red ? 'card-red' : 'card-black'];
  if (selected) classes.push('card-selected');
  if (disabled) classes.push('card-disabled');
  if (small) classes.push('card-small');
  const face = (
    <>
      <span className="card-rank">{rankLabel(card.rank)}</span>
      <span className="card-suit">{STRAIN_SYMBOL[card.suit]}</span>
    </>
  );
  if (!onClick) {
    return (
      <span className={classes.join(' ')} aria-label={cardLabel(card)}>
        {face}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-label={cardLabel(card)}
      aria-pressed={selected ?? false}
      disabled={disabled}
      onClick={onClick}
    >
      {face}
    </button>
  );
}
