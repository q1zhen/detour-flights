import { useId } from 'react';
import type { CSSProperties } from 'react';
import { Slider } from 'radix-ui';
import { Button } from '@radix-ui/themes';
import { formatDuration } from '../lib/format';
import type { TimeRange } from '../lib/types';

// A denser scale for useful connection windows, with longer windows still reachable.
export const DURATION_TICKS = [
  0,
  ...Array.from({ length: 48 }, (_, i) => (i + 1) * 30),
  ...Array.from({ length: 24 }, (_, i) => 1500 + i * 60),
  ...Array.from({ length: 20 }, (_, i) => 3240 + i * 360),
];
export function DurationRangeField({
  label,
  value,
  onChange,
  disabled,
  optional = false,
}: {
  label: string;
  value: [number | null, number | null];
  onChange: (value: [number | null, number | null]) => void;
  disabled: boolean;
  optional?: boolean;
}) {
  const id = useId();
  const ticks = optional ? [...DURATION_TICKS, Infinity] : DURATION_TICKS;
  const indices: TimeRange = [
    value[0] === null ? 0 : Math.max(0, ticks.indexOf(value[0])),
    value[1] === null ? ticks.length - 1 : Math.max(0, ticks.indexOf(value[1])),
  ];
  const labelFor = (i: number) =>
    ticks[i] === Infinity
      ? 'Any'
      : ticks[i] === 0
        ? '0h'
        : formatDuration(ticks[i]).replace(/ 0m$/, '');
  return (
    <div className="duration-range" role="group" aria-labelledby={id}>
      <div className="time-range-heading">
        <label id={id}>{label}</label>
        <strong>
          {optional && value.every((v) => v === null)
            ? 'Any'
            : `${labelFor(indices[0])} – ${labelFor(indices[1])}`}
        </strong>
        {optional && value.some((v) => v !== null) && (
          <Button
            type="button"
            size="1"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange([null, null])}
            aria-label={`Reset ${label.toLowerCase()}`}
          >
            Reset
          </Button>
        )}
      </div>
      <Slider.Root
        className="time-range-bar ticked-slider"
        style={{ '--tick-count': ticks.length - 1 } as CSSProperties}
        value={indices}
        min={0}
        max={ticks.length - 1}
        step={1}
        disabled={disabled}
        onValueChange={([a, b]) =>
          onChange([
            ticks[Math.min(a, DURATION_TICKS.length - 1)],
            ticks[b] === Infinity ? null : ticks[b],
          ])
        }
      >
        <Slider.Track className="time-range-track">
          <Slider.Range className="time-range-selected" />
        </Slider.Track>
        <Slider.Thumb
          className="time-range-thumb"
          aria-label={`${label} minimum`}
          aria-valuetext={labelFor(indices[0])}
        />
        <Slider.Thumb
          className="time-range-thumb"
          aria-label={`${label} maximum`}
          aria-valuetext={labelFor(indices[1])}
        />
      </Slider.Root>
      <div className="time-range-scale duration-scale" aria-hidden="true">
        {[0, 1440, 2880, ticks[ticks.length - 1]].map((v, i) => (
          <span key={i} style={{ left: `${(ticks.indexOf(v) / (ticks.length - 1)) * 100}%` }}>
            {v === Infinity ? 'Any' : `${v / 60}h`}
          </span>
        ))}
      </div>
    </div>
  );
}
