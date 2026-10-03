import { type Game, phaseOf, resultOf } from '../../game';
import { contractText, resultText, scoreText } from '../text';

interface Props {
  readonly game: Game;
  readonly onNext: () => void;
  readonly onReplay: () => void;
}

export function ResultPanel({ game, onNext, onReplay }: Props) {
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
