import { useState } from 'react';
import {
  type Auction,
  type Call,
  DOUBLE,
  LEVELS,
  PASS,
  REDOUBLE,
  STRAINS,
  bid,
  isLegalCall,
  sameCall,
} from '../../core';
import { callLabel } from '../../bidding';

interface Props {
  readonly auction: Auction;
  readonly onCall: (call: Call) => void;
}

export function BiddingBox({ auction, onCall }: Props) {
  const [selected, setSelected] = useState<Call | null>(null);

  const button = (call: Call) => {
    const isSelected = selected !== null && sameCall(selected, call);
    const red = call.type === 'bid' && (call.strain === 'H' || call.strain === 'D');
    const classes = ['bid-button'];
    if (isSelected) classes.push('bid-selected');
    if (red) classes.push('bid-red');
    return (
      <button
        key={callLabel(call)}
        type="button"
        className={classes.join(' ')}
        disabled={!isLegalCall(auction, call)}
        aria-pressed={isSelected}
        onClick={() => setSelected(isSelected ? null : call)}
      >
        {callLabel(call)}
      </button>
    );
  };

  return (
    <div className="bidding-box">
      <div className="bid-grid">
        {LEVELS.flatMap((level) => STRAINS.map((strain) => button(bid(level, strain))))}
      </div>
      <div className="bid-side">
        {button(PASS)}
        {button(DOUBLE)}
        {button(REDOUBLE)}
        <button
          type="button"
          className="primary confirm"
          disabled={selected === null}
          onClick={() => {
            if (selected) {
              onCall(selected);
              setSelected(null);
            }
          }}
        >
          {selected === null
            ? 'Kies een bod'
            : selected.type === 'bid'
              ? `Bied ${callLabel(selected)}`
              : callLabel(selected)}
        </button>
      </div>
    </div>
  );
}
