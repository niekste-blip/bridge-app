import { useState } from 'react';
import { type Auction, type Seat, type Vulnerability, isVulnerable, sideOf } from '../../core';
import { SEAT_NAME, shortCallLabel } from '../text';

// West is shown first, as on a bidding pad
const COLUMNS: readonly Seat[] = ['W', 'N', 'E', 'S'];

interface Props {
  readonly auction: Auction;
  readonly vulnerability: Vulnerability;
  // What the call at a position means, shown when the user taps it
  readonly meaning: (index: number) => string;
}

export function AuctionGrid({ auction, vulnerability, meaning }: Props) {
  const [opened, setOpened] = useState<number | null>(null);
  // Empty cells before the dealer's first call
  const offset = COLUMNS.indexOf(auction.dealer);
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...auction.calls.map((_, index) => index),
  ];

  return (
    <div className="auction">
      <div className="auction-grid">
        {COLUMNS.map((seat) => (
          <div
            key={seat}
            className={
              isVulnerable(sideOf(seat), vulnerability) ? 'auction-head vulnerable' : 'auction-head'
            }
          >
            {SEAT_NAME[seat]}
          </div>
        ))}
        {cells.map((index, position) =>
          index === null ? (
            <div key={`empty-${position}`} className="auction-cell" />
          ) : (
            <button
              key={index}
              type="button"
              className={index === opened ? 'auction-cell auction-call opened' : 'auction-cell auction-call'}
              onClick={() => setOpened(index === opened ? null : index)}
            >
              {shortCallLabel(auction.calls[index])}
            </button>
          ),
        )}
      </div>
      {opened !== null && opened < auction.calls.length && (
        <p className="auction-note">{meaning(opened)}</p>
      )}
    </div>
  );
}
