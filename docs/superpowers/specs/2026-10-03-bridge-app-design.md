# Bridge-app: ontwerp

Datum: 2026-10-03

## Doel

Een Nederlandstalige app waarmee de moeder van de opdrachtgever bridge leert en potjes speelt tegen bots op drie moeilijkheidsniveaus.

## Gebruiker en uitgangspunten

- Gebruiker: iemand die andere slagenspellen kent (slagen, troef, bekennen), maar bridge nog niet. Bieden, de dummy en de telling zijn nieuw.
- Apparaat: tablet (iPad of vergelijkbaar), liggend en staand bruikbaar.
- Taal: Nederlands, met Nederlandse bridgetermen (schoppen, harten, ruiten, klaveren, SA, doublet, redoublet, pas).
- Biedsysteem: 5-kaart hoog, zoals in Nederlandse cursussen onderwezen.
- Volledig offline na de eerste keer laden. Geen account, geen server, geen AI-dienst.

## Buiten scope

- Spelen tegen echte mensen.
- Accounts of synchronisatie tussen apparaten.
- Andere biedsystemen dan 5-kaart hoog.
- Wedstrijdvormen (paren, viertallen) en bijbehorende tellingen.
- Vrije vragen aan een AI-coach.

## Techniek

- TypeScript, React, Vite.
- Installeerbare web-app (PWA) met service worker, zodat de app offline werkt en op het beginscherm gezet kan worden.
- Rekenwerk van bots en coach draait in een Web Worker, zodat het scherm niet hapert.
- Opslag lokaal in de browser (`localStorage`) voor voortgang, instellingen en het lopende spel. De gegevens zijn klein genoeg; IndexedDB is niet nodig.
- Tests met Vitest.
- Hosting: statisch (bijvoorbeeld GitHub Pages of Netlify). De keuze volgt later; tot die tijd draait de app lokaal.

## Architectuur

Alle spelkennis zit in modules zonder schermcode, die los van de interface te testen zijn. De interface is een dunne laag eromheen.

| Module | Verantwoordelijkheid | Hangt af van |
|---|---|---|
| `core` | Kaarten, handen, delen, geldigheid van biedingen en kaarten, slagen, contract, telling inclusief kwetsbaarheid | niets |
| `bidding` | Tabel met biedregels voor 5-kaart hoog. Elke regel heeft een voorwaarde, een bod, een Nederlandse uitlegtekst en de les waarin hij geïntroduceerd wordt | `core` |
| `solver` | Berekent bij vier open handen hoeveel slagen elke speelbare kaart oplevert (double dummy) | `core` |
| `bots` | Kiest een bod via `bidding`; kiest een kaart via vuistregels of via simulatie met `solver` | `bidding`, `solver` |
| `coach` | Hint vóór een zet, uitleg van een bod, nabespreking na een spel | `bidding`, `solver` |
| `lessons` | Leerpad: lessen als data, oefeningen nakijken, voortgang | `bidding`, `core` |
| `app` | Speeltafel, biedbox, lesschermen, instellingen, opslag | alle modules |

### Eén bron van waarheid voor bieden

`bidding` is de enige plek waar biedkennis staat. Dezelfde regel bepaalt:

- wat een bot biedt;
- welke uitleg de coach toont bij een bod;
- welk antwoord in een lesoefening goed is.

Bot, coach en les kunnen elkaar daardoor niet tegenspreken.

Een biedregel bevat:

- `id`
- `lesson`: nummer van de les waarin de regel geïntroduceerd wordt
- `situation`: functie van het biedverloop naar waar of onwaar (bijvoorbeeld "partner opende 1♥ en ik heb nog niet geboden")
- `requires`: de eis aan de hand als gegevens: een puntenbereik, minimum- en maximumlengtes per kleur, en of de hand verdeeld moet zijn
- `call`: het bod
- `priority`: bij meerdere passende regels wint de hoogste
- `explanation`: korte Nederlandse tekst over wat het bod belooft

De voorwaarde is gesplitst in `situation` en `requires`, zodat uit een bod van een speler is af te leiden wat die speler heeft beloofd. Het vangnet en later de simulatie van de bots gebruiken dat.

De regelset is te filteren op een maximaal lesnummer. Zo bieden bots nooit iets wat de gebruiker nog niet geleerd heeft.

Past geen enkele regel, dan geldt een vangnet: pas, of het goedkoopste geldige bod dat de eigen kleur steunt als passen niet verantwoord is. Het vangnet biedt de manche als de eigen punten plus het door partner beloofde minimum 25 of meer zijn, geeft één keer voorkeur tussen twee kleuren van partner, en past anders. Elk bod meldt of het uit een regel of uit het vangnet komt.

## Bots

Er zijn drie niveaus voor de tegenstanders.

| Niveau | Bieden | Afspelen |
|---|---|---|
| Makkelijk | Regels tot en met les 7, zonder tussenbieden | Vuistregels (hoog in de derde hand, laag in de tweede, troef trekken als leider) |
| Gemiddeld | Volledige regelset zonder conventies uit les 11 en 13 | Simulatie met 20 verdelingen; kiest met 15 procent kans de op één na beste kaart |
| Moeilijk | Volledige regelset | Simulatie met 100 verdelingen; kiest altijd de beste kaart |

Bots krijgen dezelfde regelfilter op lesnummer als de partner: het niveau bepaalt het plafond, de voortgang van de gebruiker begrenst het verder. De ondergrens is les 7: openen, antwoorden en herbieden horen bij elkaar, en een bot die alleen kan openen laat elk biedverloop doodlopen. Het filter werkt dus pas vanaf de conventies van les 10 en later. In lesoefeningen geldt het lesnummer van de oefening zonder ondergrens.

### Simulatie

1. Verdeel de onbekende kaarten willekeurig over de verborgen handen, zodanig dat de verdeling klopt met wat bekend is: gespeelde kaarten, kleuren waarin iemand niet bekende, en de grenzen die uit het biedverloop volgen (punten en kleurlengtes volgens de gebruikte biedregels).
2. Los elke verdeling op met `solver`.
3. Kies de kaart met het hoogste gemiddelde aantal slagen.

Bots kijken nooit in verborgen handen.

De rekenmodule is snel genoeg voor het eindspel, niet voor een hele hand: één berekening duurt enkele milliseconden bij 8 kaarten per hand, tot een halve seconde bij 9, en minuten bij 13. Daarom simuleren de bots pas met 8 of minder kaarten in de hand. Daarvoor, de eerste vijf slagen, spelen alle niveaus op vuistregels. De simulatie krijgt in de app een tijdsbudget van ongeveer anderhalve seconde: na minstens één verdeling stopt ze zodra dat op is. Simulatie vanaf de eerste slag vraagt een geavanceerder zoekalgoritme en is een mogelijke latere verbetering.

### De partner

De partner van de gebruiker is een bot die altijd de volledige regelset gebruikt tot en met de laatst afgeronde les, en afspeelt op niveau Moeilijk. De partner gebruikt dus nooit een conventie die de gebruiker nog niet kent.

## Coach

- **Hint:** een knop tijdens bieden en spelen. Toont het aanbevolen bod met de uitleg van de regel, of de aanbevolen kaart met de reden. Gebruik is vrijwillig.
- **Uitleg bij een bod:** tikken op een bod in het biedverloop toont wat het belooft volgens de regel die de bot gebruikte.
- **Nabespreking:** na elk spel maximaal drie leermomenten, de belangrijkste eerst.
  - Bieden: een bod dat afwijkt van de regel, met het voorgeschreven bod en de uitleg.
  - Afspelen: een kaart die volgens de simulatie gemiddeld minstens één slag kost ten opzichte van de beste kaart. Dit wordt alleen beoordeeld met 8 of minder kaarten in de hand, dus vanaf de zesde slag.
  - Biedadvies en de beoordeling van het bieden gebruiken alleen regels uit lessen die de gebruiker heeft afgerond.
  - De gebruiker kan hetzelfde spel opnieuw spelen.

## Leerpad

Het pad begint met afspelen en gaat daarna naar bieden, omdat de gebruiker slagenspellen al kent.

| # | Les | Leerdoel |
|---|---|---|
| 1 | Bridge in vogelvlucht | Partners, de dummy, een contract, het boekje van 6 slagen |
| 2 | Afspelen zonder troef | Vaste slagen tellen, een lange kleur ontwikkelen |
| 3 | Afspelen met troef | Troef trekken, aftroeven in de dummy |
| 4 | Punten tellen en openen | Honneurpunten, 1 in een kleur openen met 5-kaart hoog |
| 5 | De 1SA-opening | Openen met 15-17 punten en erop antwoorden |
| 6 | Antwoorden op 1 in een kleur | Steunen, nieuwe kleur, 1SA |
| 7 | De herbieding | Als opener de hand verder omschrijven |
| 8 | Telling en manche | Deelscore, manche, slem, kwetsbaarheid |
| 9 | Tegenspel | Uitkomen en eenvoudig signaleren |
| 10 | Tussenbieden | Volgbod en informatiedoublet |
| 11 | Stayman en Jacoby | De twee belangrijkste conventies na 1SA |
| 12 | Speeltechniek | Snijden en entrees |
| 13 | Sterke en zwakke openingen | 2 klaveren, 2SA, zwakke twee |

### Opbouw van een les

1. Uitleg in drie tot vijf korte schermen met een voorbeeldhand.
2. Vijf tot tien oefeningen van twee soorten:
   - **Biedvraag:** een hand en een biedverloop; de gebruiker tikt het juiste bod aan.
   - **Speelopdracht:** een voorbereid spel met een vast contract; de gebruiker speelt het af en moet een opgegeven aantal slagen halen.
3. Bij een fout verschijnt direct de uitleg en komt de oefening later in dezelfde les terug.
4. Een les is afgerond bij minstens 80 procent goed in de eerste poging. Dan gaat de volgende les open.

Lessen zijn databestanden (JSON) met tekst, voorbeeldhanden en oefeningen. Een les toevoegen of een tekst aanpassen vraagt geen wijziging in de code.

### Tussen de lessen

- **Vrij spelen** kan vanaf les 1. Tot en met les 3 zonder bieden: de app laat alle vier de handen door bots bieden met de volledige regelset (het lesfilter geldt hier niet, want de gebruiker biedt niet mee), deelt opnieuw tot de gebruiker leider is, toont alleen het eindcontract en laat haar het afspelen. Vanaf les 4 biedt ze zelf.
- **Herhalen:** een knop "Oefen wat ik lastig vond" met oefeningen die eerder fout gingen. Een oefening verdwijnt uit deze lijst na twee keer achter elkaar goed.

## Interface

Schermen:

- **Start:** verder met de les, vrij spelen, herhalen, instellingen.
- **Leerpad:** lijst van lessen met status (afgerond, open, op slot).
- **Les:** uitlegschermen en oefeningen.
- **Speeltafel:** eigen hand onderaan, dummy open op tafel, de lopende slag in het midden, biedverloop en contract in beeld, slagentelling voor beide partijen.
- **Biedbox:** alle biedingen in een raster; ongeldige biedingen zijn grijs.
- **Nabespreking:** uitslag, telling en de leermomenten.
- **Instellingen:** botniveau, tekstgrootte, puntentelling tonen, voortgang wissen.

Bediening:

- Grote kaarten en letters, hoog contrast, instelbare tekstgrootte.
- Geen tijdsdruk en geen klok.
- Ongeldige kaarten en biedingen zijn grijs en niet aan te tikken.
- Een kaart of bod kiezen is aantikken en daarna bevestigen.
- Een knop om de laatste eigen zet terug te nemen, zolang de slag of de biedronde nog niet verder is.
- De honneurpunten van de eigen hand staan standaard in beeld en zijn uit te zetten.
- Als de gebruiker leider is, speelt ze ook de kaarten van de dummy. Is de partner leider, dan speelt de app de hand van de partner en kijkt de gebruiker mee.

## Opslag en foutafhandeling

- Na elke zet wordt het lopende spel opgeslagen. Bij opnieuw openen gaat de gebruiker verder waar ze was.
- Voortgang per les, de herhaallijst en instellingen worden lokaal bewaard.
- Is opgeslagen data onleesbaar of van een oudere versie die niet om te zetten is, dan start de app met een leeg lopend spel en blijft de lesvoortgang waar mogelijk behouden. De gebruiker krijgt hiervan een korte melding.
- Loopt de simulatie in de Web Worker vast of duurt die langer dan vijf seconden, dan valt de bot terug op de vuistregels. De worker wordt dan gestopt en opnieuw gestart.
- Is de opslag geblokkeerd of vol, dan werkt de app door zonder te bewaren.
- Een nieuwe versie van de app wordt op de achtergrond opgehaald en is actief nadat de app is afgesloten en opnieuw geopend.

## Testen

- **`core`:** telling tegen de officiële scoretabel; geldigheid van biedingen en kaarten met voorbeeldsituaties.
- **`bidding`:** per regel voorbeeldhanden met het verwachte bod.
- **`solver`:** bekende posities met een bekend aantal slagen.
- **`lessons`:** een automatische controle dat het goede antwoord van elke biedvraag gelijk is aan wat `bidding` voorschrijft, en dat elke speelopdracht haalbaar is volgens `solver`.
- **`bots`:** duizenden spellen bot tegen bot om te controleren dat er nooit een ongeldige zet komt of een spel vastloopt, en dat Moeilijk over veel spellen aantoonbaar beter scoort dan Makkelijk.
- **`app`:** het volledige verloop van een spel en van een les in de browser.

## Bouwvolgorde

Elke stap krijgt een eigen bouwplan en levert iets op dat getest kan worden.

1. `core`
2. `bidding` (regels voor les 4 tot en met 7 eerst, de rest volgt met de lessen)
3. `solver`
4. `bots`
5. Speelbare app: speeltafel, biedbox, vrij spelen, opslag
6. `coach`: hint, uitleg, nabespreking
7. `lessons`: leerpad en de inhoud van les 1 tot en met 7. Les 8, 9 en 12 vragen alleen inhoud en volgen in één vervolgplan; les 10, 11 en 13 vragen elk eerst nieuwe biedregels
8. PWA-afwerking en online zetten
