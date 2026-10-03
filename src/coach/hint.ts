import { type Card, rankLabel, sameCard, seededRng } from '../core';
import { type Choice, STRAIN_SYMBOL, chooseCall, meaningsOf } from '../bidding';
import {
  BASE_LESSON,
  type HeuristicRule,
  type PlayerView,
  SIMULATION_MAX_CARDS,
  evaluateCards,
  handToPlay,
  heuristicChoice,
  legalCardsFor,
  limitsFor,
  viewOfPlay,
} from '../bots';
import { type Game, type Settings, USER, turnOf } from '../game';

export interface CardHint {
  readonly card: Card;
  // Why this card, in Dutch, without naming the card itself
  readonly text: string;
}

export interface CardHintOptions {
  readonly seed: number;
  readonly maxLesson: number;
  // 0 gives the rule of thumb without simulation
  readonly samples?: number;
  readonly budgetMs?: number;
  readonly now?: () => number;
}

export const NO_AGREEMENT = 'Voor dit bod is geen afspraak.';
const HINT_SAMPLES = 40;
const EPSILON = 1e-9;

const RULE_TEXT: Readonly<Record<HeuristicRule, string>> = {
  'draw-trumps': 'Trek troef: speel uw hoogste troef, zodat de tegenstanders niet kunnen aftroeven.',
  'cash-winner': 'Deze kaart kan niemand slaan: haal de slag binnen.',
  'long-suit': 'Kom uit in uw langste kleur om daar slagen te maken.',
  'second-hand-low': 'Tweede hand laag: bewaar uw hoge kaarten.',
  'cover-honour': 'Honneur op honneur: sla de hoge kaart van de tegenstander.',
  'third-hand-high': 'Derde hand hoog: probeer de slag te winnen.',
  'win-cheaply': 'U speelt als laatste: win de slag met de laagste kaart die genoeg is.',
  'play-low': 'Deze slag kunt u niet winnen, of partner wint hem al: speel laag.',
  ruff: 'U kunt niet bekennen: troef de slag met een lage troef.',
  discard: 'U kunt niet bekennen: gooi een lage kaart weg.',
};

export function cardName(card: Card): string {
  return `${STRAIN_SYMBOL[card.suit]}${rankLabel(card.rank)}`;
}

// One decimal with a comma, as in Dutch
export function tricksText(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

// The bots never know less than lesson 7, and neither does the advice
export function lessonFor(settings: Settings): number {
  return Math.max(BASE_LESSON, settings.progressLesson);
}

// Bidding advice for the user never uses a rule from a lesson she has not finished,
// with lesson 4 (opening) as the least
const FIRST_BIDDING_LESSON = 4;

export function adviceLesson(settings: Settings): number {
  return Math.max(FIRST_BIDDING_LESSON, settings.progressLesson);
}

// The call the rules prescribe for the user now; null when it is not the user's turn to call
export function callHint(game: Game, settings: Settings): Choice | null {
  const turn = turnOf(game);
  if (!turn || turn.kind !== 'call' || !turn.byUser) return null;
  return chooseCall(game.deal[USER], game.auction, { maxLesson: adviceLesson(settings) });
}

export function cardHintFor(view: PlayerView, options: CardHintOptions): CardHint {
  const legal = legalCardsFor(view);
  if (legal.length === 1) {
    return { card: legal[0], text: 'Dit is de enige kaart die u mag spelen.' };
  }
  const thumb = heuristicChoice(view);
  const samples = options.samples ?? HINT_SAMPLES;
  if (samples === 0 || handToPlay(view).length > SIMULATION_MAX_CARDS) {
    return { card: thumb.card, text: RULE_TEXT[thumb.rule] };
  }

  const evaluations = evaluateCards(view, {
    samples,
    rng: seededRng(options.seed),
    limits: limitsFor(view, options.maxLesson),
    budgetMs: options.budgetMs,
    now: options.now,
  });
  const best = Math.max(...evaluations.map((evaluation) => evaluation.average));
  const bestCards = evaluations.filter((e) => best - e.average < EPSILON).map((e) => e.card);
  if (bestCards.length === evaluations.length) {
    return {
      card: thumb.card,
      text: `Alle kaarten leveren hier evenveel slagen op. ${RULE_TEXT[thumb.rule]}`,
    };
  }
  const card =
    bestCards.find((candidate) => sameCard(candidate, thumb.card)) ??
    bestCards.reduce((lowest, candidate) => (candidate.rank < lowest.rank ? candidate : lowest));
  const second = Math.max(
    ...evaluations.filter((e) => best - e.average >= EPSILON).map((e) => e.average),
  );
  return {
    card,
    text: `Deze kaart levert in de rest van het spel gemiddeld de meeste slagen op: ${tricksText(best)}. De beste andere kaart haalt ${tricksText(second)}.`,
  };
}

// The card to advise the user now; null when it is not the user's turn to play
export function cardHint(
  game: Game,
  settings: Settings,
  options: Partial<CardHintOptions> = {},
): CardHint | null {
  const turn = turnOf(game);
  if (!turn || turn.kind !== 'card' || !turn.byUser || !game.play) return null;
  const cardsPlayed = game.play.completed.length * 4 + game.play.current.cards.length;
  return cardHintFor(viewOfPlay(game.play, game.auction), {
    seed: game.seed * 100 + cardsPlayed + 50,
    maxLesson: lessonFor(settings),
    ...options,
  });
}

// What the call at this position means: the explanation the bot gave, or what the rules say
export function callMeaning(game: Game, index: number, settings: Settings): string {
  const note = game.notes[index];
  if (note) return note;
  const meanings = meaningsOf(game.auction, index, { maxLesson: lessonFor(settings) });
  return meanings.length > 0 ? meanings.join(' Of: ') : NO_AGREEMENT;
}
