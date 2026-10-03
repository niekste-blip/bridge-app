import { type Game, phaseOf } from '../../game';

interface Props {
  readonly game: Game | null;
  readonly notice: string | null;
  readonly onContinue: () => void;
  readonly onNew: () => void;
  readonly onSettings: () => void;
  readonly onDismissNotice: () => void;
}

export function HomeScreen({ game, notice, onContinue, onNew, onSettings, onDismissNotice }: Props) {
  const running = game !== null && (phaseOf(game) === 'auction' || phaseOf(game) === 'play');
  return (
    <div className="home">
      <h1>Bridge</h1>
      {notice && (
        <p className="notice" role="alert">
          {notice}{' '}
          <button type="button" onClick={onDismissNotice}>
            Sluiten
          </button>
        </p>
      )}
      <nav className="home-menu">
        {running && (
          <button type="button" className="primary" onClick={onContinue}>
            Verder met spel {game.board}
          </button>
        )}
        <button type="button" className={running ? '' : 'primary'} onClick={onNew}>
          Nieuw spel
        </button>
        <button type="button" onClick={onSettings}>
          Instellingen
        </button>
      </nav>
    </div>
  );
}
