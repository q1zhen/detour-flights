import { useEffect, useId, useState } from 'react';
import { Button, Callout, IconButton, Badge, TextField, Switch } from '@radix-ui/themes';
import { ExclamationTriangleIcon, MagnifyingGlassIcon, SwitchIcon } from '@radix-ui/react-icons';
import { airlineCodes, buildRequest, initialValues, validateSearch } from '../lib/search';
import type { Cabin, SearchRequest, SearchValues } from '../lib/types';
import { TravelerPicker } from './TravelerPicker';
import { SearchOptions } from './SearchOptions';
import { SelectField } from './SelectField';
import { CandidateFilterSliders } from './CandidateFilterSliders';
import { DEFAULT_CANDIDATE_FILTERS } from '../lib/routes';
import { DEFAULT_TRANSFER_OPTIONS, validateTransferOptions } from '../lib/self-transfer';
import type { GlobeDraft } from '../lib/globe';
import { DurationRangeField } from './DurationRangeField';
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
  onPreviewChange,
}: {
  onSearch: (request: SearchRequest, options: TransferOptions) => void;
  loading: boolean;
  onCancel: () => void;
  onPreviewChange?: (draft: GlobeDraft) => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<string[]>([]);
  const preferenceId = useId();
  const [transferWindow, setTransferWindow] = useState<[number, number]>([
    DEFAULT_TRANSFER_OPTIONS.minBufferMinutes,
    DEFAULT_TRANSFER_OPTIONS.maxBufferMinutes,
  ]);
  const [preferenceScope, setPreferenceScope] =
    useState<NonNullable<TransferOptions['preferenceScope']>>('long-leg');
  const [candidateFilters, setCandidateFilters] = useState(() => ({
    ...DEFAULT_CANDIDATE_FILTERS,
  }));
  useEffect(() => {
    onPreviewChange?.({
      from: values.from.trim(),
      to: values.to.trim(),
      filters: candidateFilters,
      requestKey: JSON.stringify(buildRequest(values)),
      transferOptions: {
        minBufferMinutes: transferWindow[0],
        maxBufferMinutes: transferWindow[1],
        candidateFilters: { ...candidateFilters },
        preferenceScope,
      },
      allow: airlineCodes(values.allowConnections),
      block: airlineCodes(values.blockConnections),
      signature: JSON.stringify({ values, candidateFilters, transferWindow, preferenceScope }),
    });
  }, [values, candidateFilters, transferWindow, preferenceScope, onPreviewChange]);
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
          minBufferMinutes: transferWindow[0],
          maxBufferMinutes: transferWindow[1],
          candidateFilters: { ...candidateFilters },
          preferenceScope,
        };
        if (!validateTransferOptions(options))
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
        <div className="flight-preferences">
          <label className="field">
            <span>Airline / alliance</span>
            <TextField.Root
              aria-label="Airline or alliance codes"
              value={values.outboundAirlines}
              onChange={(event) => update('outboundAirlines', event.target.value.toUpperCase())}
              placeholder="Any · AA, STAR_ALLIANCE"
              list={`${preferenceId}-alliances`}
            />
            <datalist id={`${preferenceId}-alliances`}>
              <option value="ONEWORLD">Oneworld</option>
              <option value="SKYTEAM">SkyTeam</option>
              <option value="STAR_ALLIANCE">Star Alliance</option>
            </datalist>
          </label>
          <div className="field">
            <label htmlFor={`${preferenceId}-cabin`}>Class</label>
            <SelectField
              id={`${preferenceId}-cabin`}
              label="Cabin class"
              value={values.seat}
              onChange={(value) => update('seat', value)}
              options={cabins}
            />
          </div>
          <div className="field preference-scope">
            <span id={`${preferenceId}-scope-label`}>Self-transfer scope</span>
            <label className="preference-switch" htmlFor={`${preferenceId}-scope`}>
              <Switch
                id={`${preferenceId}-scope`}
                disabled={loading}
                aria-label="Apply airline and class to all self-transfer segments"
                checked={preferenceScope === 'all-segments'}
                onCheckedChange={(checked) =>
                  setPreferenceScope(checked ? 'all-segments' : 'long-leg')
                }
              />
              <span>{preferenceScope === 'all-segments' ? 'All segments' : 'Long leg only'}</span>
            </label>
          </div>
        </div>
        <SearchOptions values={values} update={update} disabled={loading} />
        <div className="transfer-options">
          <DurationRangeField
            label="Self-transfer window"
            value={transferWindow}
            disabled={loading}
            onChange={([min, max]) => setTransferWindow([min ?? 0, max ?? 10080])}
          />
          <span className="column-tag">Short leg: nonstop</span>
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
