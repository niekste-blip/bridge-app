import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { type Moment } from '../coach';
import { PASS, bid, legalCards } from '../core';
import {
  DEFAULT_SETTINGS,
  type Game,
  botCallIn,
  botCardIn,
  newGame,
  phaseOf,
  turnOf,
  userCall,
  userCard,
} from '../game';
import { BiddingBox } from './components/BiddingBox';
import { HomeScreen } from './components/HomeScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { TableScreen } from './components/TableScreen';

const noop = () => {};
const pass = { call: PASS, ruleId: 'test', explanation: 'Pas: test.', source: 'rule' as const };

interface Extra {
  readonly hint?: string;
  readonly review?: readonly Moment[];
}

function table(game: Game, extra: Extra = {}): string {
  return renderToStaticMarkup(
    <TableScreen
      game={game}
      settings={DEFAULT_SETTINGS}
      hint={extra.hint ?? null}
      review={extra.review ?? null}
      meaning={(index) => `betekenis ${index}`}
      onHint={noop}
      onCall={noop}
      onCard={noop}
      onUndo={noop}
      onNext={noop}
      onReplay={noop}
      onHome={noop}
    />,
  );
}

// Board 1 (North deals): South bids 1NT and everyone else passes
function southDeclares(): Game {
  let game = newGame(1, 1);
  while (phaseOf(game) === 'auction') {
    const turn = turnOf(game);
    game = turn?.byUser
      ? userCall(game, game.auction.calls.length === 2 ? bid(1, 'NT') : PASS)
      : botCallIn(game, pass);
  }
  return game;
}

function playCards(game: Game, count: number): Game {
  let current = game;
  for (let i = 0; i < count && current.play; i++) {
    const card = legalCards(current.play)[0];
    current = turnOf(current)?.byUser ? userCard(current, card) : botCardIn(current, card);
  }
  return current;
}

describe('TableScreen', () => {
  it('shows the bidding box when the user is to call', () => {
    const game = botCallIn(botCallIn(newGame(1, 1), pass), pass);
    const html = table(game);
    expect(html).toContain('U bent aan de beurt om te bieden.');
    expect(html).toContain('Kies een bod');
    expect(html).toContain('Niemand kwetsbaar');
    expect(html).toContain('punten');
    expect(html).not.toContain('Neem terug');
  });

  it('shows who is bidding while a bot thinks', () => {
    expect(table(newGame(1, 1))).toContain('Noord biedt…');
  });

  it('shows the contract and dummy during the play', () => {
    const html = table(playCards(southDeclares(), 1));
    expect(html).toContain('1SA door Zuid');
    expect(html).toContain('Kies een kaart uit de hand van Noord (de dummy).');
    expect(html).toContain('Kies een kaart');
  });

  it('offers to take back a card while the trick is open', () => {
    expect(table(playCards(southDeclares(), 2))).toContain('Neem terug');
  });

  it('shows the result when the board is over', () => {
    const html = table(playCards(southDeclares(), 52));
    expect(html).toContain('Volgend spel');
    expect(html).toContain('Dit spel opnieuw');
    expect(html).toMatch(/punten voor (Noord-Zuid|Oost-West)/);
  });

  it('offers a hint to the user and shows it', () => {
    const game = botCallIn(botCallIn(newGame(1, 1), pass), pass);
    expect(table(game)).toContain('>Hint<');
    expect(table(game, { hint: 'Advies: pas.' })).toContain('Advies: pas.');
    expect(table(newGame(1, 1))).not.toContain('>Hint<');
  });

  it('shows the review after the board', () => {
    const finished = playCards(southDeclares(), 52);
    expect(table(finished)).toContain('De nabespreking wordt gemaakt…');
    expect(table(finished, { review: [] })).toContain('Geen leermomenten gevonden in dit spel.');
    const moments: Moment[] = [{ kind: 'card', text: 'Slag 2: test.', weight: 1 }];
    expect(table(finished, { review: moments })).toContain('<li>Slag 2: test.</li>');
  });

  it('hides the points when asked', () => {
    const html = renderToStaticMarkup(
      <TableScreen
        game={newGame(1, 1)}
        settings={{ ...DEFAULT_SETTINGS, showPoints: false }}
        hint={null}
        review={null}
        meaning={() => ''}
        onHint={noop}
        onCall={noop}
        onCard={noop}
        onUndo={noop}
        onNext={noop}
        onReplay={noop}
        onHome={noop}
      />,
    );
    expect(html).not.toContain('punten');
  });
});

describe('BiddingBox', () => {
  it('disables calls that are not legal', () => {
    const auction = userCall(botCallIn(botCallIn(newGame(1, 1), pass), pass), bid(1, 'H')).auction;
    const html = renderToStaticMarkup(<BiddingBox auction={auction} onCall={noop} />);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>1♣<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>1♥<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>1♠<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Doublet<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Redoublet<\/button>/);
  });
});

describe('HomeScreen and SettingsScreen', () => {
  it('offers to continue a running board', () => {
    const html = renderToStaticMarkup(
      <HomeScreen
        game={newGame(4, 1)}
        notice="Let op"
        onContinue={noop}
        onNew={noop}
        onSettings={noop}
        onDismissNotice={noop}
      />,
    );
    expect(html).toContain('Verder met spel 4');
    expect(html).toContain('Nieuw spel');
    expect(html).toContain('Let op');
  });

  it('does not offer to continue without a board', () => {
    const html = renderToStaticMarkup(
      <HomeScreen
        game={null}
        notice={null}
        onContinue={noop}
        onNew={noop}
        onSettings={noop}
        onDismissNotice={noop}
      />,
    );
    expect(html).not.toContain('Verder met spel');
  });

  it('shows the settings in Dutch', () => {
    const html = renderToStaticMarkup(
      <SettingsScreen settings={DEFAULT_SETTINGS} onChange={noop} onReset={noop} onBack={noop} />,
    );
    for (const text of ['Makkelijk', 'Gemiddeld', 'Moeilijk', 'Extra groot', 'Zelf bieden', 'Alles wissen']) {
      expect(html).toContain(text);
    }
  });
});
