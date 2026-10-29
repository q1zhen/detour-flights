import { useState } from 'react';
import { Button, Callout, IconButton, Badge, TextField } from '@radix-ui/themes';
import { ExclamationTriangleIcon, MagnifyingGlassIcon, SwitchIcon } from '@radix-ui/react-icons';
import { buildRequest, initialValues, validateSearch } from '../lib/search';
import type { Cabin, SearchRequest, SearchValues } from '../lib/types';
import { TravelerPicker } from './TravelerPicker';
import { SearchOptions } from './SearchOptions';
import { SelectField } from './SelectField';
import { CandidateFilterSliders } from './CandidateFilterSliders';
import { DEFAULT_CANDIDATE_FILTERS } from '../lib/routes';
import { validateTransferOptions } from '../lib/self-transfer';
import type { TransferOptions } from '../lib/self-transfer';

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
  onSearch: (request: SearchRequest, options: TransferOptions) => void;
  loading: boolean;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<string[]>([]);
  const [minTransfer, setMinTransfer] = useState('2');
  const [maxTransfer, setMaxTransfer] = useState('24');
  const [candidateFilters, setCandidateFilters] = useState(() => ({
    ...DEFAULT_CANDIDATE_FILTERS,
  }));
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
        const options = {
          minBufferMinutes: Number(minTransfer) * 60,
          maxBufferMinutes: Number(maxTransfer) * 60,
          candidateFilters: { ...candidateFilters },
        };
        if (!minTransfer.trim() || !maxTransfer.trim() || !validateTransferOptions(options))
          nextErrors.push(
            'Choose an ordered self-transfer window between 0 and 168 hours, in whole minutes.',
          );
        setErrors(nextErrors);
        if (!nextErrors.length) onSearch(buildRequest(values), options);
      }}
      aria-label="Flight search"
    >
      <fieldset className="search-fieldset" disabled={loading}>
        <div className="search-toolbar">
          <Badge size="2" color="blue" variant="soft">
            One way
          </Badge>
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
        <div className="route-grid one-way">
          <label className="field route-field">
            <span>
              From <small>IATA</small>
            </span>
            <TextField.Root
              size="3"
              value={values.from}
              placeholder="JFK"
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
            <span>
              To <small>IATA</small>
            </span>
            <TextField.Root
              size="3"
              value={values.to}
              placeholder="LAX"
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
          <Button className="search-button" size="3" type="submit" loading={loading}>
            <MagnifyingGlassIcon width="18" height="18" />
            Search
          </Button>
        </div>
        <SearchOptions values={values} update={update} disabled={loading} />
        <div className="transfer-options">
          <div>
            <strong>Self-transfer window</strong>
            <span className="column-tag">Short leg: nonstop</span>
          </div>
          <label className="field">
            <span>Minimum hours</span>
            <TextField.Root
              type="number"
              min="0"
              max="168"
              step="0.5"
              value={minTransfer}
              onChange={(event) => setMinTransfer(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Maximum hours</span>
            <TextField.Root
              type="number"
              min="0"
              max="168"
              step="0.5"
              value={maxTransfer}
              onChange={(event) => setMaxTransfer(event.target.value)}
            />
          </label>
        </div>
        <CandidateFilterSliders
          value={candidateFilters}
          onChange={setCandidateFilters}
          disabled={loading}
        />
      </fieldset>
      {errors.length > 0 && (
        <Callout.Root color="red" role="alert" mt="3">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <div className="callout-message">
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        </Callout.Root>
      )}
      {loading && (
        <Button
          className="cancel-search"
          type="button"
          variant="ghost"
          color="gray"
          onClick={onCancel}
        >
          Cancel search
        </Button>
      )}
    </form>
  );
}
