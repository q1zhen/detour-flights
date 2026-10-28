import { TextField } from '@radix-ui/themes';
import { MixerHorizontalIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { SelectField } from './SelectField';
import type { LegStopChoice, SearchValues, StopChoice } from '../lib/types';

export const stopOptions: { value: StopChoice; label: string }[] = [
  { value: 'any', label: 'Any number of stops' },
  { value: '0', label: 'Nonstop only' },
  { value: '1', label: 'Up to 1 stop' },
  { value: '2', label: 'Up to 2 stops' },
  { value: '3', label: 'Up to 3 stops' },
];
const legStopOptions: { value: LegStopChoice; label: string }[] = [
  { value: 'inherit', label: 'Use overall stop limit' },
  ...stopOptions,
];
export function SearchOptions({
  values,
  update,
}: {
  values: SearchValues;
  update: <K extends keyof SearchValues>(key: K, value: SearchValues[K]) => void;
}) {
  const active =
    values.stops !== 'any' ||
    values.outboundStops !== 'inherit' ||
    values.outboundAirlines ||
    (values.trip === 'round-trip' && (values.returnStops !== 'inherit' || values.returnAirlines)) ||
    values.currency !== 'USD' ||
    values.language !== 'en-US';
  return (
    <details className="search-options">
      <summary>
        <MixerHorizontalIcon /> Search options{' '}
        {active && <span className="active-dot" aria-label="Custom options applied" />}
        <ChevronDownIcon className="details-chevron" />
      </summary>
      <div className="options-content">
        <div className="options-grid">
          <label className="field">
            <span>Overall stop limit</span>
            <SelectField
              label="Overall stop limit"
              value={values.stops}
              onChange={(v) => update('stops', v)}
              options={stopOptions}
            />
          </label>
          <label className="field">
            <span>Currency</span>
            <TextField.Root
              value={values.currency}
              onChange={(e) => update('currency', e.target.value.toUpperCase())}
              placeholder="USD"
              maxLength={3}
              list="currencies"
            />
          </label>
          <label className="field">
            <span>Results language</span>
            <TextField.Root
              value={values.language}
              onChange={(e) => update('language', e.target.value)}
              placeholder="en-US"
              list="languages"
            />
          </label>
        </div>
        <datalist id="currencies">
          {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CNY', 'JPY', 'INR', 'SGD', 'CHF'].map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <datalist id="languages">
          {['en-US', 'en-GB', 'es', 'fr', 'de', 'it', 'pt-BR', 'zh-CN', 'ja', 'ko'].map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <p className="field-help">
          Enter any supported three-letter currency or Google Flights language code.
        </p>
        <div className="leg-options">
          <LegOptions
            title="Outbound flight"
            stops={values.outboundStops}
            airlines={values.outboundAirlines}
            setStops={(v) => update('outboundStops', v)}
            setAirlines={(v) => update('outboundAirlines', v)}
          />
          {values.trip === 'round-trip' && (
            <LegOptions
              title="Return flight"
              stops={values.returnStops}
              airlines={values.returnAirlines}
              setStops={(v) => update('returnStops', v)}
              setAirlines={(v) => update('returnAirlines', v)}
            />
          )}
        </div>
        <p className="field-help">
          Airlines: two-character codes separated by commas, up to 50 per leg. Leave blank for any
          airline. A per-flight stop limit overrides the overall limit.
        </p>
      </div>
    </details>
  );
}
function LegOptions({
  title,
  stops,
  airlines,
  setStops,
  setAirlines,
}: {
  title: string;
  stops: LegStopChoice;
  airlines: string;
  setStops: (v: LegStopChoice) => void;
  setAirlines: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      <div className="leg-fields">
        <label className="field">
          <span>Stops</span>
          <SelectField
            label={`${title} stops`}
            value={stops}
            onChange={setStops}
            options={legStopOptions}
          />
        </label>
        <label className="field">
          <span>Airline codes</span>
          <TextField.Root
            aria-label={`${title} airline codes`}
            value={airlines}
            onChange={(e) => setAirlines(e.target.value.toUpperCase())}
            placeholder="e.g. AA, DL, B6"
          />
        </label>
      </div>
    </fieldset>
  );
}
