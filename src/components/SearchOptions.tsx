import { TextField } from '@radix-ui/themes';
import { MixerHorizontalIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { SelectField } from './SelectField';
import { TimeRangeField } from './TimeRangeField';
import { DurationRangeField } from './DurationRangeField';
import { isAnyTime } from '../lib/search';
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
  disabled,
}: {
  values: SearchValues;
  update: <K extends keyof SearchValues>(key: K, value: SearchValues[K]) => void;
  disabled: boolean;
}) {
  const active =
    !isAnyTime(values.departureTime) ||
    !isAnyTime(values.arrivalTime) ||
    values.stops !== 'any' ||
    values.minLayover ||
    values.maxLayover ||
    values.allowConnections ||
    values.blockConnections;
  return (
    <details className="search-options">
      <summary>
        <MixerHorizontalIcon /> Times & connections{' '}
        {active && <span className="active-dot" aria-label="Custom filters applied" />}
        <ChevronDownIcon />
      </summary>
      <div className="time-filters">
        <TimeRangeField
          label="Departure time"
          value={values.departureTime}
          onChange={(v) => update('departureTime', v)}
          disabled={disabled}
        />
        <TimeRangeField
          label="Arrival time"
          value={values.arrivalTime}
          onChange={(v) => update('arrivalTime', v)}
          disabled={disabled}
        />
      </div>
      <div className="filter-footer">
        <span>Local airport times</span>
        {(!isAnyTime(values.departureTime) || !isAnyTime(values.arrivalTime)) && (
          <span>Filters apply when you search</span>
        )}
      </div>
      <div className="options-grid">
        <div className="field">
          <label htmlFor="stop-limit">Stops · regular / long leg</label>
          <SelectField
            id="stop-limit"
            label="Stops"
            value={values.stops}
            onChange={(v) => update('stops', v)}
            options={stopOptions}
          />
        </div>
        <DurationRangeField
          label="Within-ticket layover"
          optional
          disabled={disabled}
          value={[
            values.minLayover === '' ? null : Number(values.minLayover),
            values.maxLayover === '' ? null : Number(values.maxLayover),
          ]}
          onChange={([min, max]) => {
            update('minLayover', min === null ? '' : String(min));
            update('maxLayover', max === null ? '' : String(max));
          }}
        />
        <label className="field">
          <span>Connect only at</span>
          <TextField.Root
            aria-label="Allowed connection airports"
            placeholder="Any · e.g. JFK, LHR"
            value={values.allowConnections}
            onChange={(e) => update('allowConnections', e.target.value.toUpperCase())}
          />
        </label>
        <label className="field">
          <span>Avoid connections at</span>
          <TextField.Root
            aria-label="Blocked connection airports"
            placeholder="None · e.g. ORD"
            value={values.blockConnections}
            onChange={(e) => update('blockConnections', e.target.value.toUpperCase())}
          />
        </label>
      </div>
    </details>
  );
}
