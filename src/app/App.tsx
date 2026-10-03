import { useEffect, useReducer } from 'react';
import { FRESH, botRequestFor, load, save, turnOf } from '../game';
import { askBot } from './botClient';
import { HomeScreen } from './components/HomeScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { TableScreen } from './components/TableScreen';
import { initialState, reduce } from './state';

// Pause before a bot acts, so the user can follow the play; longer after a finished trick
const BOT_DELAY_MS = 700;
const TRICK_DELAY_MS = 1600;

// Storage can be blocked or full; the app then simply runs without saving
function start() {
  try {
    const { saved, recovered } = load(window.localStorage);
    return initialState(saved, recovered);
  } catch {
    return initialState(FRESH, false);
  }
}

export function App() {
  const [state, dispatch] = useReducer(reduce, undefined, start);
  const { saved, screen } = state;
  const { game, settings } = saved;

  useEffect(() => {
    try {
      save(window.localStorage, saved);
    } catch {
      // Nothing to do: the game goes on, it just is not kept
    }
  }, [saved]);

  useEffect(() => {
    if (!game || screen !== 'table') return;
    const request = botRequestFor(game, settings);
    if (!request) return;
    let cancelled = false;
    const trickJustFinished =
      game.play !== null && game.play.current.cards.length === 0 && game.play.completed.length > 0;
    const timer = setTimeout(
      () => {
        void askBot(request).then((answer) => {
          if (!cancelled) dispatch({ type: 'bot', answer, forGame: game });
        });
      },
      trickJustFinished ? TRICK_DELAY_MS : BOT_DELAY_MS,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [game, settings, screen]);

  const newBoard = () => dispatch({ type: 'newBoard', seed: Math.floor(Math.random() * 1_000_000) + 1 });

  return (
    <div className={`app text-${settings.textSize}`}>
      {screen === 'table' && game ? (
        <TableScreen
          game={game}
          settings={settings}
          onCall={(call) => dispatch({ type: 'call', call })}
          onCard={(card) => dispatch({ type: 'card', card })}
          onUndo={() => dispatch({ type: 'undo' })}
          onNext={newBoard}
          onReplay={() => dispatch({ type: 'replay' })}
          onHome={() => dispatch({ type: 'go', screen: 'home' })}
        />
      ) : screen === 'settings' ? (
        <SettingsScreen
          settings={settings}
          onChange={(next) => dispatch({ type: 'settings', settings: next })}
          onReset={() => dispatch({ type: 'reset' })}
          onBack={() => dispatch({ type: 'go', screen: 'home' })}
        />
      ) : (
        <HomeScreen
          game={game}
          notice={state.notice}
          onContinue={() => dispatch({ type: 'go', screen: 'table' })}
          onNew={() => {
            const running = game !== null && turnOf(game) !== null;
            if (!running || window.confirm('Het lopende spel stoppen en een nieuw spel beginnen?')) {
              newBoard();
            }
          }}
          onSettings={() => dispatch({ type: 'go', screen: 'settings' })}
          onDismissNotice={() => dispatch({ type: 'dismissNotice' })}
        />
      )}
    </div>
  );
}
