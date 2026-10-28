import { useState } from 'react';
import { Button, Callout, Flex, IconButton, SegmentedControl, TextField } from '@radix-ui/themes';
import { ExclamationTriangleIcon, MagnifyingGlassIcon, SwitchIcon } from '@radix-ui/react-icons';
import { buildRequest, initialValues, validateSearch } from '../lib/search';
import type { Cabin, SearchRequest, SearchValues, Trip } from '../lib/types';
import { TravelerPicker } from './TravelerPicker';
import { SearchOptions } from './SearchOptions';
import { SelectField } from './SelectField';

const cabins: { value: Cabin; label: string }[] = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium-economy', label: 'Premium economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First class' },
];
export function SearchForm({
  onSearch,
  loading,
  onCancel,
}: {
  onSearch: (request: SearchRequest) => void;
  loading: boolean;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<string[]>([]);
  function update<K extends keyof SearchValues>(key: K, value: SearchValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }
  return (
    <form
      className="search-panel"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const nextErrors = validateSearch(values);
        setErrors(nextErrors);
        if (!nextErrors.length) onSearch(buildRequest(values));
      }}
      aria-label="Flight search"
    >
      <fieldset className="search-fieldset" disabled={loading}>
        <div className="search-toolbar">
          <SegmentedControl.Root
            value={values.trip}
            onValueChange={(v) => update('trip', v as Trip)}
            aria-label="Trip type"
          >
            <SegmentedControl.Item value="round-trip">Round trip</SegmentedControl.Item>
            <SegmentedControl.Item value="one-way">One way</SegmentedControl.Item>
          </SegmentedControl.Root>
          <div className="travel-preferences">
            <TravelerPicker value={values.passengers} onChange={(v) => update('passengers', v)} />
            <span className="toolbar-divider" />
            <SelectField
              label="Cabin class"
              value={values.seat}
              onChange={(v) => update('seat', v)}
              options={cabins}
            />
          </div>
        </div>
        <div className={`route-grid ${values.trip === 'one-way' ? 'one-way' : ''}`}>
          <label className="field route-field">
            <span>From</span>
            <TextField.Root
              size="3"
              value={values.from}
              placeholder="JFK"
              aria-describedby="airport-help"
              onChange={(e) => update('from', e.target.value.toUpperCase())}
              maxLength={3}
              autoComplete="off"
            />
          </label>
          <IconButton
            className="swap-button"
            type="button"
            variant="surface"
            color="gray"
            radius="full"
            aria-label="Swap departure and arrival airports"
            onClick={() =>
              setValues((previous) => ({ ...previous, from: previous.to, to: previous.from }))
            }
          >
            <SwitchIcon />
          </IconButton>
          <label className="field route-field">
            <span>To</span>
            <TextField.Root
              size="3"
              value={values.to}
              placeholder="LAX"
              aria-describedby="airport-help"
              onChange={(e) => update('to', e.target.value.toUpperCase())}
              maxLength={3}
              autoComplete="off"
            />
          </label>
          <label className="field date-field">
            <span>Departure</span>
            <TextField.Root
              size="3"
              type="date"
              value={values.departure}
              onInput={(e) => update('departure', e.currentTarget.value)}
              onChange={(e) => update('departure', e.target.value)}
            />
          </label>
          {values.trip === 'round-trip' && (
            <label className="field date-field">
              <span>Return</span>
              <TextField.Root
                size="3"
                type="date"
                value={values.returnDate}
                min={values.departure}
                onInput={(e) => update('returnDate', e.currentTarget.value)}
                onChange={(e) => update('returnDate', e.target.value)}
              />
            </label>
          )}
        </div>
        <p className="field-help" id="airport-help">
          Use three-letter airport codes, like JFK for New York or LHR for London.
        </p>
        <SearchOptions values={values} update={update} />
      </fieldset>
      {errors.length > 0 && (
        <Callout.Root color="red" role="alert" mt="3">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <div className="callout-message">
            <span>Please check your search.</span>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        </Callout.Root>
      )}
      <div className="search-bottom">
        <span className="search-hint">A change of scenery is a search away.</span>
        <Flex gap="3" align="center">
          {loading && (
            <Button type="button" variant="ghost" color="gray" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button className="search-button" size="3" type="submit" loading={loading}>
            <MagnifyingGlassIcon width="18" height="18" />
            Search flights
          </Button>
        </Flex>
      </div>
    </form>
  );
}
