import { useId } from 'react';
import { Button } from '@radix-ui/themes';
import { Slider } from 'radix-ui';
import { CANDIDATE_FILTER_LIMITS, DEFAULT_CANDIDATE_FILTERS } from '../lib/routes';
import type { CandidateFilters } from '../lib/routes';

const fields: { key: keyof CandidateFilters; label: string; format: (value: number) => string }[] =
  [
    { key: 'ratio', label: 'Distance multiplier', format: (value) => `${value.toFixed(2)}×` },
    {
      key: 'slackKm',
      label: 'Extra distance',
      format: (value) => `${value.toLocaleString('en-US')} km`,
    },
    { key: 'minDegree', label: 'Min outbound routes', format: (value) => String(value) },
  ];
export function CandidateFilterSliders({
  value,
  onChange,
  disabled,
}: {
  value: CandidateFilters;
  onChange: (value: CandidateFilters) => void;
  disabled: boolean;
}) {
  const id = useId();
  const changed = fields.some(({ key }) => value[key] !== DEFAULT_CANDIDATE_FILTERS[key]);
  return (
    <section className="candidate-filters" aria-labelledby={`${id}-heading`}>
      <div className="candidate-filter-heading">
        <h3 id={`${id}-heading`}>Midpoint filters</h3>
        <span>
          Distance ≤ {value.ratio.toFixed(2)}× direct + {value.slackKm.toLocaleString('en-US')} km
        </span>
        <Button
          type="button"
          variant="ghost"
          size="1"
          disabled={disabled || !changed}
          aria-label="Reset midpoint filters"
          onClick={() => onChange({ ...DEFAULT_CANDIDATE_FILTERS })}
        >
          Reset
        </Button>
      </div>
      <div className="candidate-filter-grid">
        {fields.map(({ key, label, format }) => {
          const limits = CANDIDATE_FILTER_LIMITS[key];
          return (
            <div key={key} role="group" aria-labelledby={`${id}-${key}`}>
              <div className="time-range-heading">
                <label id={`${id}-${key}`}>{label}</label>
                <strong>{format(value[key])}</strong>
              </div>
              <Slider.Root
                className="time-range-bar"
                value={[value[key]]}
                {...limits}
                disabled={disabled}
                onValueChange={([next]) => onChange({ ...value, [key]: Number(next.toFixed(2)) })}
              >
                <Slider.Track className="time-range-track">
                  <Slider.Range className="time-range-selected" />
                </Slider.Track>
                <Slider.Thumb
                  className="time-range-thumb"
                  aria-label={label}
                  aria-valuetext={format(value[key])}
                />
              </Slider.Root>
              <div className="time-range-scale" aria-hidden="true">
                <span>{format(limits.min)}</span>
                <span>{format(limits.max)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
