import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  LESSONS,
  type Session,
  answered,
  lessonSession,
  nextPage,
  practiceSession,
  stageOf,
} from '../lessons';
import { LessonScreen } from './components/LessonScreen';
import { LessonsScreen } from './components/LessonsScreen';

const noop = () => {};

function lessonHtml(session: Session): string {
  return renderToStaticMarkup(
    <LessonScreen session={session} onNext={noop} onBack={noop} onAnswer={noop} onClose={noop} />,
  );
}

function atExercises(number: number): Session {
  let session = lessonSession(LESSONS[number - 1]);
  while (stageOf(session) === 'pages') session = nextPage(session);
  return session;
}

// Skips exercises until one of the wanted kind is the current one
function atKind(number: number, kind: 'choice' | 'bid' | 'play'): Session {
  let session = atExercises(number);
  while (session.queue[0].type !== kind) session = answered(session, true);
  return session;
}

describe('LessonsScreen', () => {
  const html = (completed: number[], trouble: string[], unlockAll = false) =>
    renderToStaticMarkup(
      <LessonsScreen
        lessons={LESSONS}
        progress={{ completed, trouble: trouble.map((id) => ({ id, streak: 0 })) }}
        unlockAll={unlockAll}
        onOpen={noop}
        onPractice={noop}
        onBack={noop}
      />,
    );

  it('lists the lessons with their status', () => {
    const page = html([1], []);
    expect(page).toContain('Bridge in vogelvlucht');
    expect(page).toContain('De herbieding');
    expect(page.match(/Afgerond/g)).toHaveLength(1);
    expect(page.match(/>Open</g)).toHaveLength(1);
    expect(page.match(/Op slot/g)).toHaveLength(5);
  });

  it('opens every lesson when asked', () => {
    expect(html([], [], true)).not.toContain('Op slot');
  });

  it('offers practice only when there is something to practise', () => {
    expect(html([], [])).toMatch(/<button[^>]*disabled=""[^>]*>Oefen wat ik lastig vond<\/button>/);
    expect(html([1], ['l1-down', 'l1-sa'])).toContain('Oefen wat ik lastig vond (2)');
  });
});

describe('LessonScreen', () => {
  it('shows a page of explanation', () => {
    const html = lessonHtml(lessonSession(LESSONS[0]));
    expect(html).toContain('Les 1: Bridge in vogelvlucht');
    expect(html).toContain('Uitleg 1 van 4');
    expect(html).toContain('Vier spelers, twee paren');
    expect(html).toContain('Volgende');
  });

  it('shows a hand with a page that has one', () => {
    const html = lessonHtml(lessonSession(LESSONS[3]));
    expect(html).toContain('Honneurpunten');
    expect(html).toContain('aria-label="♠A"');
  });

  it('shows a multiple choice question', () => {
    const html = lessonHtml(atKind(1, 'choice'));
    expect(html).toContain('Hoeveel slagen moet de leider halen in een contract van 3SA?');
    expect(html).toContain('Nog 7 te gaan');
  });

  it('shows a bidding question with the hand and the bidding box', () => {
    const html = lessonHtml(atKind(6, 'bid'));
    expect(html).toContain('U zit Zuid. Wat biedt u met deze hand?');
    expect(html).toContain('Kies een bod');
    expect(html).toContain('>1♥<');
  });

  it('shows a play position with dummy open and the defenders hidden', () => {
    const html = lessonHtml(atKind(2, 'play'));
    expect(html).toContain('Om te beginnen: zonder troef, u bent aan slag in Zuid. Haal alle vier de slagen.');
    expect(html).toContain('Noord (dummy)');
    expect(html).toContain('Slagen voor u: 0 van de 4 die u nodig heeft.');
    expect(html).toContain('aria-label="4 kaarten"');
  });

  it('shows the outcome of a finished lesson', () => {
    let session = atExercises(1);
    while (stageOf(session) !== 'done') session = answered(session, true);
    const html = lessonHtml(session);
    expect(html).toContain('U had 7 van de 7 oefeningen in één keer goed.');
    expect(html).toContain('De les is afgerond.');
  });

  it('says so when the lesson was not passed', () => {
    let session = answered(answered(atExercises(1), false), false);
    while (stageOf(session) !== 'done') session = answered(session, true);
    expect(lessonHtml(session)).toContain('Om de les af te ronden');
  });

  it('shows a practice round without pages', () => {
    const html = lessonHtml(practiceSession(LESSONS, ['l1-down']));
    expect(html).toContain('Oefen wat ik lastig vond');
    expect(html).toContain('Het contract is 2♠.');
  });
});
