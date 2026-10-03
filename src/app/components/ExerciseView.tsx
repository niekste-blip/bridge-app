import { useEffect, useState } from 'react';
import {
  type Call,
  type Card,
  type PlayState,
  SEATS,
  type Seat,
  isPlayComplete,
  legalCards,
  parseHand,
  playCard,
  sameCard,
  seatToPlay,
} from '../../core';
import { callLabel, meaningsOf } from '../../bidding';
import {
  type BidExercise,
  type ChoiceExercise,
  type Exercise,
  type PlayExercise,
  bidAnswer,
  bidSetup,
  defenderCard,
  isRightCall,
  startPosition,
  studentToPlay,
  tricksForStudent,
} from '../../lessons';
import { SEAT_NAME, cardLabel } from '../text';
import { AuctionGrid } from './AuctionGrid';
import { BiddingBox } from './BiddingBox';
import { HandView, HiddenHand } from './HandView';
import { TrickArea } from './TrickArea';

// Pause before a defender plays, so the student can follow the trick
const DEFENDER_DELAY_MS = 900;

interface Props<T extends Exercise> {
  readonly exercise: T;
  readonly lessonNumber: number;
  // Called when the student moves on, with whether the answer was right
  readonly onDone: (right: boolean) => void;
}

function Feedback({
  right,
  text,
  onDone,
}: {
  readonly right: boolean;
  readonly text: string;
  readonly onDone: () => void;
}) {
  return (
    <div className={right ? 'feedback feedback-right' : 'feedback feedback-wrong'} role="status">
      <p>
        <strong>{right ? 'Goed!' : 'Niet goed.'}</strong> {text}
      </p>
      <button type="button" className="primary" onClick={onDone}>
        Verder
      </button>
    </div>
  );
}

function ChoiceView({ exercise, onDone }: Props<ChoiceExercise>) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="exercise">
      <p className="question">{exercise.question}</p>
      {exercise.hand && <HandView hand={parseHand(exercise.hand)} />}
      <div className="options">
        {exercise.options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={
              picked === null
                ? 'option-button'
                : index === exercise.answer
                  ? 'option-button option-right'
                  : index === picked
                    ? 'option-button option-wrong'
                    : 'option-button'
            }
            disabled={picked !== null}
            aria-pressed={picked === index}
            onClick={() => setPicked(index)}
          >
            {option}
          </button>
        ))}
      </div>
      {picked !== null && (
        <Feedback
          right={picked === exercise.answer}
          text={exercise.explanation}
          onDone={() => onDone(picked === exercise.answer)}
        />
      )}
    </div>
  );
}

function BidView({ exercise, lessonNumber, onDone }: Props<BidExercise>) {
  const [given, setGiven] = useState<Call | null>(null);
  const { hand, auction, seat } = bidSetup(exercise);
  const answer = bidAnswer(exercise, lessonNumber);
  const right = given !== null && isRightCall(exercise, lessonNumber, given);
  const meaning = (index: number) =>
    meaningsOf(auction, index, { maxLesson: lessonNumber }).join(' Of: ') || 'Voor dit bod is geen afspraak.';
  return (
    <div className="exercise">
      <p className="question">
        U zit {SEAT_NAME[seat]}. Wat biedt u met deze hand?
      </p>
      {auction.calls.length > 0 && (
        <AuctionGrid auction={auction} vulnerability="none" meaning={meaning} />
      )}
      <HandView hand={hand} />
      {given === null ? (
        <BiddingBox auction={auction} onCall={setGiven} />
      ) : (
        <Feedback
          right={right}
          text={right ? answer.explanation : `U bood ${callLabel(given)}. Het juiste bod is ${answer.explanation}`}
          onDone={() => onDone(right)}
        />
      )}
    </div>
  );
}

function PlayView({ exercise, onDone }: Props<PlayExercise>) {
  const [state, setState] = useState<PlayState>(() => startPosition(exercise));
  const [selected, setSelected] = useState<Card | null>(null);
  const over = isPlayComplete(state);
  const mine = !over && studentToPlay(state);
  const toPlay = over ? null : seatToPlay(state);
  const playable = mine ? legalCards(state) : [];
  const chosen = selected && playable.some((card) => sameCard(card, selected)) ? selected : null;
  const tricks = tricksForStudent(state);

  useEffect(() => {
    if (over || mine) return;
    const timer = setTimeout(() => {
      setState((current) =>
        isPlayComplete(current) || studentToPlay(current)
          ? current
          : playCard(current, defenderCard(current, current.completed.length * 4 + current.current.cards.length)),
      );
    }, DEFENDER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, over, mine]);

  const playChosen = () => {
    if (chosen) {
      setState(playCard(state, chosen));
      setSelected(null);
    }
  };
  const select = (card: Card) => (chosen && sameCard(chosen, card) ? playChosen() : setSelected(card));

  const hand = (seat: Seat) => {
    if (seat === 'E' || seat === 'W') return <HiddenHand count={state.hands[seat].length} />;
    const active = seat === toPlay && mine;
    return (
      <HandView
        hand={state.hands[seat]}
        playable={active ? playable : undefined}
        selected={active ? chosen : null}
        onSelect={active ? select : undefined}
      />
    );
  };

  return (
    <div className="exercise">
      <p className="question">{exercise.intro}</p>
      <p className="play-count">
        Slagen voor u: {tricks} van de {exercise.target} die u nodig heeft.
      </p>
      <div className="table practice-table">
        {SEATS.map((seat) => (
          <section key={seat} className={`seat seat-${seat}`}>
            <h3 className={seat === toPlay ? 'seat-name to-play' : 'seat-name'}>
              {SEAT_NAME[seat]}
              {seat === 'N' ? ' (dummy)' : seat === 'S' ? ' (u)' : ''}
            </h3>
            {hand(seat)}
          </section>
        ))}
        <section className="centre">
          <TrickArea play={state} toPlay={toPlay} />
        </section>
      </div>
      {over ? (
        <Feedback
          right={tricks >= exercise.target}
          text={
            tricks >= exercise.target
              ? exercise.explanation
              : `U haalde ${tricks} van de ${exercise.target} slagen. ${exercise.explanation}`
          }
          onDone={() => onDone(tricks >= exercise.target)}
        />
      ) : (
        mine && (
          <button type="button" className="primary confirm" disabled={!chosen} onClick={playChosen}>
            {chosen ? `Speel ${cardLabel(chosen)}` : 'Kies een kaart'}
          </button>
        )
      )}
    </div>
  );
}

export function ExerciseView({ exercise, lessonNumber, onDone }: Props<Exercise>) {
  switch (exercise.type) {
    case 'choice':
      return <ChoiceView exercise={exercise} lessonNumber={lessonNumber} onDone={onDone} />;
    case 'bid':
      return <BidView exercise={exercise} lessonNumber={lessonNumber} onDone={onDone} />;
    case 'play':
      return <PlayView exercise={exercise} lessonNumber={lessonNumber} onDone={onDone} />;
  }
}
