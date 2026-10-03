import { useState } from 'react';
import {
  type Call,
  type Card,
  SEATS,
  type Seat,
  highCardPoints,
  legalCards,
  sameCard,
  tricksWon,
} from '../../core';
import {
  type Game,
  type Settings,
  USER,
  canUndo,
  handOf,
  phaseOf,
  turnOf,
  visibleSeats,
} from '../../game';
import { SEAT_NAME, cardLabel, contractText, vulnerabilityText } from '../text';
import { AuctionGrid } from './AuctionGrid';
import { BiddingBox } from './BiddingBox';
import { HandView, HiddenHand } from './HandView';
import { ResultPanel } from './ResultPanel';
import { TrickArea } from './TrickArea';

interface Props {
  readonly game: Game;
  readonly settings: Settings;
  readonly onCall: (call: Call) => void;
  readonly onCard: (card: Card) => void;
  readonly onUndo: () => void;
  readonly onNext: () => void;
  readonly onReplay: () => void;
  readonly onHome: () => void;
}

export function TableScreen(props: Props) {
  const { game, settings } = props;
  const [selected, setSelected] = useState<Card | null>(null);
  const phase = phaseOf(game);
  const turn = turnOf(game);
  const visible = visibleSeats(game);
  const over = phase === 'finished' || phase === 'passedOut';
  const userPlays = turn?.kind === 'card' && turn.byUser ? turn.seat : null;
  const playable = userPlays && game.play ? legalCards(game.play) : [];
  const chosen = selected && playable.some((card) => sameCard(card, selected)) ? selected : null;

  const playChosen = () => {
    if (chosen) {
      props.onCard(chosen);
      setSelected(null);
    }
  };
  // A second tap on the chosen card plays it
  const select = (card: Card) => (chosen && sameCard(chosen, card) ? playChosen() : setSelected(card));

  const hand = (seat: Seat) => {
    // After the board the four hands are shown as they were dealt
    const cards = over ? game.deal[seat] : handOf(game, seat);
    if (!visible.includes(seat)) return <HiddenHand count={cards.length} />;
    const active = seat === userPlays;
    return (
      <HandView
        hand={cards}
        small={seat === 'E' || seat === 'W'}
        playable={active ? playable : undefined}
        selected={active ? chosen : null}
        onSelect={active ? select : undefined}
      />
    );
  };

  const status = () => {
    if (!turn) return '';
    if (turn.kind === 'call') {
      return turn.byUser ? 'U bent aan de beurt om te bieden.' : `${SEAT_NAME[turn.seat]} biedt…`;
    }
    if (!turn.byUser) return `${SEAT_NAME[turn.actor]} speelt…`;
    return turn.seat === USER
      ? 'U bent aan de beurt: kies een kaart.'
      : `Kies een kaart uit de hand van ${SEAT_NAME[turn.seat]} (de dummy).`;
  };

  return (
    <div className="table-screen">
      <header className="top-bar">
        <button type="button" onClick={props.onHome}>
          Menu
        </button>
        <span>
          Spel {game.board} · Gever {SEAT_NAME[game.dealer]} · {vulnerabilityText(game.vulnerability)}
        </span>
        {game.contract && game.play ? (
          <span className="contract">
            {contractText(game.contract)} · Slagen Noord-Zuid {tricksWon(game.play, 'NS')} · Oost-West{' '}
            {tricksWon(game.play, 'EW')}
          </span>
        ) : (
          <span className="contract">Bieden</span>
        )}
      </header>

      <main className={game.play || over ? 'table' : 'table table-auction'}>
        {SEATS.map((seat) => (
          <section key={seat} className={`seat seat-${seat}`}>
            <h3 className={seat === turn?.seat ? 'seat-name to-play' : 'seat-name'}>
              {SEAT_NAME[seat]}
              {seat === USER && settings.showPoints && ` · ${highCardPoints(game.deal[USER])} punten`}
            </h3>
            {hand(seat)}
          </section>
        ))}
        <section className="centre">
          {over ? (
            <ResultPanel game={game} onNext={props.onNext} onReplay={props.onReplay} />
          ) : game.play ? (
            <TrickArea play={game.play} toPlay={turn?.seat ?? null} />
          ) : (
            <AuctionGrid auction={game.auction} notes={game.notes} vulnerability={game.vulnerability} />
          )}
        </section>
      </main>

      <footer className="action-bar">
        <p className="status" aria-live="polite">
          {status()}
        </p>
        {turn?.kind === 'call' && turn.byUser && (
          <BiddingBox auction={game.auction} onCall={props.onCall} />
        )}
        {userPlays && (
          <button type="button" className="primary confirm" disabled={!chosen} onClick={playChosen}>
            {chosen ? `Speel ${cardLabel(chosen)}` : 'Kies een kaart'}
          </button>
        )}
        {canUndo(game) && (
          <button type="button" onClick={props.onUndo}>
            Neem terug
          </button>
        )}
      </footer>
    </div>
  );
}
