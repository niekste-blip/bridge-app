import { useState } from 'react';
import { type Auction, SEATS, type Seat, type Vulnerability, isVulnerable, sideOf } from '../../core';
import { SEAT_NAME, shortCallLabel } from '../text';

// West is shown first, as on a bidding pad
const COLUMNS: readonly Seat[] = ['W', 'N', 'E', 'S'];

interface Props {
  readonly auction: Auction;
  readonly notes: readonly (string | null)[];
  readonly vulnerability: Vulnerability;
}

export function AuctionGrid({ auction, notes, vulnerability }: Props) {
  const [opened, setOpened] = useState<number | null>(null);
  // Empty cells before the dealer's first call
  const offset = COLUMNS.indexOf(auction.dealer);
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...auction.calls.map((_, index) => index),
  ];
  const openedNote = opened !== null ? notes[opened] : null;

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
      {opened !== null && (
        <p className="auction-note">
          {openedNote ?? `${SEAT_NAME[SEATS[(SEATS.indexOf(auction.dealer) + opened) % 4]]}: eigen bod.`}
        </p>
      )}
    </div>
  );
}
