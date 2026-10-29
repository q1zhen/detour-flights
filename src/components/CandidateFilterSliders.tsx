import { useId } from 'react';
import { Button } from '@radix-ui/themes';
import { Slider } from 'radix-ui';
import { DEFAULT_CANDIDATE_FILTERS, FIXED_DISTANCE_ALLOWANCE_KM } from '../lib/routes';
import type { CandidateFilters } from '../lib/routes';

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
  const fields = [
    {
      key: 'ratio' as const,
      label: 'Extra route distance',
      value: Math.round((value.ratio - 1) * 100),
      min: 0,
      max: 200,
      step: 5,
      format: (v: number) => `${v}%`,
      help: 'How much farther the route via a midpoint may be than the direct route.',
    },
    {
      key: 'minDegree' as const,
      label: 'Minimum destinations',
      value: value.minDegree,
      min: 0,
      max: 500,
      step: 1,
      format: (v: number) => String(v),
      help: 'Minimum number of destinations served from a midpoint airport.',
    },
  ];
  const changed = fields.some(({ key }) => value[key] !== DEFAULT_CANDIDATE_FILTERS[key]);
  return (
    <section className="candidate-filters" aria-labelledby={`${id}-heading`}>
      <div className="candidate-filter-heading">
        <h3 id={`${id}-heading`}>Midpoint filters</h3>
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
        {fields.map((field) => (
          <div key={field.key} role="group" aria-labelledby={`${id}-${field.key}`}>
            <div className="time-range-heading">
              <label id={`${id}-${field.key}`} title={field.help}>
                {field.label}
              </label>
              <strong>{field.format(field.value)}</strong>
            </div>
            <Slider.Root
              className="time-range-bar"
              value={[field.value]}
              min={field.min}
              max={field.max}
              step={field.step}
              disabled={disabled}
              onValueChange={([next]) =>
                onChange({
                  ...value,
                  slackKm: FIXED_DISTANCE_ALLOWANCE_KM,
                  [field.key]: field.key === 'ratio' ? 1 + next / 100 : next,
                })
              }
            >
              <Slider.Track className="time-range-track">
                <Slider.Range className="time-range-selected" />
              </Slider.Track>
              <Slider.Thumb
                className="time-range-thumb"
                aria-label={field.label}
                aria-valuetext={field.format(field.value)}
              />
            </Slider.Root>
            <div className="time-range-scale" aria-hidden="true">
              <span>{field.format(field.min)}</span>
              <span>{field.format(field.max)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
