import { TextField } from '@radix-ui/themes';
import { MixerHorizontalIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { SelectField } from './SelectField';
import { TimeRangeField } from './TimeRangeField';
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
    values.stops !== 'any' ||
    values.outboundAirlines ||
    values.minLayover ||
    values.maxLayover ||
    values.allowConnections ||
    values.blockConnections;
  return (
    <>
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
      <details className="search-options">
        <summary>
          <MixerHorizontalIcon />
          More filters{' '}
          {active && <span className="active-dot" aria-label="Custom filters applied" />}
          <ChevronDownIcon />
        </summary>
        <div className="options-grid">
          <div className="field">
            <label htmlFor="stop-limit">Stops</label>
            <SelectField
              id="stop-limit"
              label="Stops"
              value={values.stops}
              onChange={(v) => update('stops', v)}
              options={stopOptions}
            />
          </div>
          <label className="field">
            <span>Airlines / alliances</span>
            <TextField.Root
              aria-label="Airline or alliance codes"
              value={values.outboundAirlines}
              onChange={(e) => update('outboundAirlines', e.target.value.toUpperCase())}
              placeholder="Any · AA, STAR_ALLIANCE"
              list="alliance-codes"
            />
            <datalist id="alliance-codes">
              <option value="ONEWORLD">Oneworld</option>
              <option value="SKYTEAM">SkyTeam</option>
              <option value="STAR_ALLIANCE">Star Alliance</option>
            </datalist>
          </label>
          <div className="field">
            <span>
              Each layover <small>minutes</small>
            </span>
            <div className="layover-inputs">
              <TextField.Root
                type="number"
                min="0"
                step="1"
                aria-label="Minimum layover minutes"
                placeholder="Min"
                value={values.minLayover}
                onChange={(e) => update('minLayover', e.target.value)}
              />
              <span>–</span>
              <TextField.Root
                type="number"
                min="0"
                step="1"
                aria-label="Maximum layover minutes"
                placeholder="Max"
                value={values.maxLayover}
                onChange={(e) => update('maxLayover', e.target.value)}
              />
            </div>
          </div>
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
    </>
  );
}
