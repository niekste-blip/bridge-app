import { type Game, phaseOf } from '../../game';

interface Props {
  readonly game: Game | null;
  readonly notice: string | null;
  readonly onContinue: () => void;
  readonly onNew: () => void;
  readonly onLessons: () => void;
  readonly onSettings: () => void;
  readonly onDismissNotice: () => void;
}

export function HomeScreen({
  game,
  notice,
  onContinue,
  onNew,
  onLessons,
  onSettings,
  onDismissNotice,
}: Props) {
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
        <button type="button" className="primary" onClick={onLessons}>
          Leerpad
        </button>
        {running && (
          <button type="button" onClick={onContinue}>
            Verder met spel {game.board}
          </button>
        )}
        <button type="button" onClick={onNew}>
          Nieuw spel
        </button>
        <button type="button" onClick={onSettings}>
          Instellingen
        </button>
      </nav>
    </div>
  );
}
