import { type Level } from '../../bots';
import { type Settings, type TextSize } from '../../game';
import { LEVEL_NAME, TEXT_SIZE_NAME } from '../text';

const LEVELS: readonly Level[] = ['easy', 'medium', 'hard'];
const TEXT_SIZES: readonly TextSize[] = ['normal', 'large', 'extraLarge'];

interface Props {
  readonly settings: Settings;
  readonly onChange: (settings: Settings) => void;
  readonly onReset: () => void;
  readonly onBack: () => void;
}

export function SettingsScreen({ settings, onChange, onReset, onBack }: Props) {
  return (
    <div className="settings">
      <h1>Instellingen</h1>

      <fieldset>
        <legend>Niveau van de tegenstanders</legend>
        {LEVELS.map((level) => (
          <label key={level} className="option">
            <input
              type="radio"
              name="level"
              checked={settings.level === level}
              onChange={() => onChange({ ...settings, level })}
            />
            {LEVEL_NAME[level]}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Tekstgrootte</legend>
        {TEXT_SIZES.map((textSize) => (
          <label key={textSize} className="option">
            <input
              type="radio"
              name="textSize"
              checked={settings.textSize === textSize}
              onChange={() => onChange({ ...settings, textSize })}
            />
            {TEXT_SIZE_NAME[textSize]}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Spelen</legend>
        <label className="option">
          <input
            type="checkbox"
            checked={settings.userBids}
            onChange={(event) => onChange({ ...settings, userBids: event.target.checked })}
          />
          Zelf bieden, zodra les 4 is afgerond (uit: de computer biedt en u speelt het contract)
        </label>
        <label className="option">
          <input
            type="checkbox"
            checked={settings.showPoints}
            onChange={(event) => onChange({ ...settings, showPoints: event.target.checked })}
          />
          Punten van mijn hand tonen
        </label>
      </fieldset>

      <fieldset>
        <legend>Leerpad</legend>
        <label className="option">
          <input
            type="checkbox"
            checked={settings.unlockAll}
            onChange={(event) => onChange({ ...settings, unlockAll: event.target.checked })}
          />
          Alle lessen openzetten (voor wie al kan bridgen)
        </label>
      </fieldset>

      <div className="settings-actions">
        <button type="button" className="primary" onClick={onBack}>
          Terug
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (window.confirm('Alle voortgang en instellingen wissen?')) onReset();
          }}
        >
          Alles wissen
        </button>
      </div>
    </div>
  );
}
