import { TextField } from '@radix-ui/themes';
import { MixerHorizontalIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { SelectField } from './SelectField';
import type { SearchValues, StopChoice } from '../lib/types';

const stopOptions: { value: StopChoice; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: '0', label: 'Nonstop' },
  { value: '1', label: 'Up to 1 stop' },
  { value: '2', label: 'Up to 2 stops' },
  { value: '3', label: 'Up to 3 stops' },
];
export function SearchOptions({
  values,
  update,
}: {
  values: SearchValues;
  update: <K extends keyof SearchValues>(key: K, value: SearchValues[K]) => void;
}) {
  const active = values.stops !== 'any' || values.outboundAirlines;
  return (
    <details className="search-options">
      <summary>
        <MixerHorizontalIcon />
        Filters {active && <span className="active-dot" aria-label="Custom filters applied" />}
        <ChevronDownIcon />
      </summary>
      <div className="options-grid">
        <div className="field">
          <label htmlFor="stop-limit">Stops</label>
          <SelectField
            id="stop-limit"
            label="Stops"
            value={values.stops}
            onChange={(v) => {
              update('stops', v);
            }}
            options={stopOptions}
          />
        </div>
        <label className="field">
          <span>
            Airlines <small>IATA</small>
          </span>
          <TextField.Root
            aria-label="Airline codes"
            value={values.outboundAirlines}
            onChange={(e) => update('outboundAirlines', e.target.value.toUpperCase())}
            placeholder="Any · e.g. AA, B6"
            title="Up to 50 two-character codes, separated by commas"
          />
        </label>
      </div>
    </details>
  );
}
