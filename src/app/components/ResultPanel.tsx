import { type Moment } from '../../coach';
import { type Game, phaseOf, resultOf } from '../../game';
import { contractText, resultText, scoreText } from '../text';

interface Props {
  readonly game: Game;
  // The review of this board; null while it is being made
  readonly review: readonly Moment[] | null;
  readonly onNext: () => void;
  readonly onReplay: () => void;
}

export function ResultPanel({ game, review, onNext, onReplay }: Props) {
  const result = resultOf(game);
  return (
    <div className="result">
      {phaseOf(game) === 'passedOut' || !result ? (
        <h2>Iedereen past: dit spel wordt niet gespeeld.</h2>
      ) : (
        <>
          <h2>{resultText(result)}</h2>
          <p>
            {contractText(result.contract)}: {result.declarerTricks} slagen.
          </p>
          <p className="result-score">{scoreText(result)}</p>
        </>
      )}
      <div className="review">
        <h3>Nabespreking</h3>
        {review === null ? (
          <p>De nabespreking wordt gemaakt…</p>
        ) : review.length === 0 ? (
          <p>Geen leermomenten gevonden in dit spel.</p>
        ) : (
          <ol>
            {review.map((moment) => (
              <li key={moment.text}>{moment.text}</li>
            ))}
          </ol>
        )}
      </div>
      <div className="result-actions">
        <button type="button" className="primary" onClick={onNext}>
          Volgend spel
        </button>
        <button type="button" onClick={onReplay}>
          Dit spel opnieuw
        </button>
      </div>
    </div>
  );
}
