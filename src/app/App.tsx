import { useEffect, useReducer, useState } from 'react';
import { type Moment, callHint, callMeaning, cardName } from '../coach';
import { FRESH, type Game, botRequestFor, load, phaseOf, save, turnOf } from '../game';
import { askBot, askHint, askReview } from './botClient';
import './coach.css';
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

  // Advice and review belong to one position; they are dropped as soon as the game moves on
  const [hint, setHint] = useState<{ game: Game; text: string } | null>(null);
  const [review, setReview] = useState<{ game: Game; moments: Moment[] } | null>(null);

  const showHint = () => {
    if (!game) return;
    const turn = turnOf(game);
    if (turn?.kind === 'call') {
      const advice = callHint(game, settings);
      if (advice) setHint({ game, text: `Advies: ${advice.explanation}` });
      return;
    }
    setHint({ game, text: 'Even denken…' });
    void askHint(game, settings).then((advice) => {
      if (advice) {
        setHint({ game, text: `Advies: speel ${cardName(advice.card)}. ${advice.text}` });
      }
    });
  };

  useEffect(() => {
    if (!game || screen !== 'table') return;
    const phase = phaseOf(game);
    if (phase !== 'finished' && phase !== 'passedOut') return;
    let cancelled = false;
    void askReview(game, settings).then((moments) => {
      if (!cancelled) setReview({ game, moments });
    });
    return () => {
      cancelled = true;
    };
  }, [game, settings, screen]);

  const newBoard = () => dispatch({ type: 'newBoard', seed: Math.floor(Math.random() * 1_000_000) + 1 });

  return (
    <div className={`app text-${settings.textSize}`}>
      {screen === 'table' && game ? (
        <TableScreen
          game={game}
          settings={settings}
          hint={hint?.game === game ? hint.text : null}
          review={review?.game === game ? review.moments : null}
          meaning={(index) => callMeaning(game, index, settings)}
          onHint={showHint}
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
