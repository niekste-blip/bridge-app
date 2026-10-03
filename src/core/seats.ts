export const SEATS = ['N', 'E', 'S', 'W'] as const;
export type Seat = (typeof SEATS)[number];
export type Side = 'NS' | 'EW';

export function seatAfter(seat: Seat, steps = 1): Seat {
  return SEATS[(SEATS.indexOf(seat) + steps) % 4];
}

export function partnerOf(seat: Seat): Seat {
  return seatAfter(seat, 2);
}

export function sideOf(seat: Seat): Side {
  return seat === 'N' || seat === 'S' ? 'NS' : 'EW';
}
