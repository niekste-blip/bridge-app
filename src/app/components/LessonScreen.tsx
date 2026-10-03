import { parseHand } from '../../core';
import {
  PASS_SHARE,
  type Session,
  currentExercise,
  lessonPassed,
  rightAtFirstTry,
  stageOf,
} from '../../lessons';
import { ExerciseView } from './ExerciseView';
import { HandView } from './HandView';

interface Props {
  readonly session: Session;
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly onAnswer: (right: boolean) => void;
  readonly onClose: () => void;
}

export function LessonScreen({ session, onNext, onBack, onAnswer, onClose }: Props) {
  const stage = stageOf(session);
  const exercise = currentExercise(session);
  const page = session.pages[session.page];

  return (
    <div className="lesson">
      <header className="lesson-head">
        <button type="button" onClick={onClose}>
          Stoppen
        </button>
        <h1>{session.title}</h1>
      </header>

      {stage === 'pages' && page && (
        <article className="lesson-page">
          <p className="lesson-step">
            Uitleg {session.page + 1} van {session.pages.length}
          </p>
          <h2>{page.title}</h2>
          {page.text.split('\n\n').map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {page.hand && <HandView hand={parseHand(page.hand)} />}
          <div className="lesson-nav">
            <button type="button" disabled={session.page === 0} onClick={onBack}>
              Terug
            </button>
            <button type="button" className="primary" onClick={onNext}>
              {session.page + 1 === session.pages.length ? 'Naar de oefeningen' : 'Volgende'}
            </button>
          </div>
        </article>
      )}

      {stage === 'exercises' && exercise && (
        <section className="lesson-exercise">
          <p className="lesson-step">Nog {session.queue.length} te gaan</p>
          <ExerciseView
            // An exercise that comes back after a mistake starts fresh
            key={`${exercise.id}-${session.attempts}`}
            exercise={exercise}
            lessonNumber={session.lessonOf[exercise.id]}
            onDone={onAnswer}
          />
        </section>
      )}

      {stage === 'done' && (
        <section className="lesson-done-panel">
          <h2>Klaar</h2>
          <p>
            U had {rightAtFirstTry(session)} van de {session.total} oefeningen in één keer goed.
          </p>
          {session.lessonNumber !== null &&
            (lessonPassed(Object.values(session.firstTries)) ? (
              <p>De les is afgerond. De volgende les is nu open.</p>
            ) : (
              <p>
                Om de les af te ronden moet u {Math.ceil(session.total * PASS_SHARE)} van de{' '}
                {session.total} oefeningen in één keer goed hebben. Lees de uitleg nog eens door en
                probeer het opnieuw.
              </p>
            ))}
          <button type="button" className="primary" onClick={onClose}>
            Terug naar het leerpad
          </button>
        </section>
      )}
    </div>
  );
}
