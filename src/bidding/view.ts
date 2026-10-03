import {
  type Auction,
  type Bid,
  type Seat,
  callerAt,
  partnerOf,
  sameCall,
  seatToCall,
} from '../core';

export interface AuctionView {
  readonly auction: Auction;
  readonly seat: Seat;
  readonly myBids: readonly Bid[];
  readonly partnerBids: readonly Bid[];
  readonly opponentsSilent: boolean;
}

export function viewOf(auction: Auction): AuctionView {
  const seat = seatToCall(auction);
  const partner = partnerOf(seat);
  const myBids: Bid[] = [];
  const partnerBids: Bid[] = [];
  let opponentsSilent = true;
  auction.calls.forEach((call, index) => {
    const caller = callerAt(auction, index);
    if (caller === seat) {
      if (call.type === 'bid') myBids.push(call);
    } else if (caller === partner) {
      if (call.type === 'bid') partnerBids.push(call);
    } else if (call.type !== 'pass') {
      opponentsSilent = false;
    }
  });
  return { auction, seat, myBids, partnerBids, opponentsSilent };
}

export function isOpening(view: AuctionView): boolean {
  return view.auction.calls.every((call) => call.type === 'pass');
}

export function isResponseTo(view: AuctionView, opening: Bid): boolean {
  return (
    view.opponentsSilent &&
    view.myBids.length === 0 &&
    view.partnerBids.length === 1 &&
    sameCall(view.partnerBids[0], opening)
  );
}

export function isRebidAfter(view: AuctionView, opening: Bid, response: Bid): boolean {
  return (
    view.opponentsSilent &&
    view.myBids.length === 1 &&
    view.partnerBids.length === 1 &&
    sameCall(view.myBids[0], opening) &&
    sameCall(view.partnerBids[0], response)
  );
}
