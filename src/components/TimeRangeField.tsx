import { useId } from 'react';
import { Button } from '@radix-ui/themes';
import { Slider } from 'radix-ui';
import { isAnyTime, LAST_MINUTE, timeLabel } from '../lib/search';
import type { TimeRange } from '../lib/types';

export function TimeRangeField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <div className="time-range-field" role="group" aria-labelledby={id}>
      <div className="time-range-heading">
        <label id={id}>{label}</label>
        <strong>
          {isAnyTime(value) ? 'Any time' : `${timeLabel(value[0])} – ${timeLabel(value[1])}`}
        </strong>
        {!isAnyTime(value) && (
          <Button
            type="button"
            size="1"
            variant="ghost"
            disabled={disabled}
            aria-label={`Reset ${label.toLowerCase()}`}
            onClick={() => onChange([0, LAST_MINUTE])}
          >
            Reset
          </Button>
        )}
      </div>
      <Slider.Root
        className="time-range-bar ticked-slider"
        value={value.map((v) => (v === LAST_MINUTE ? 96 : Math.round(v / 15)))}
        min={0}
        max={96}
        step={1}
        minStepsBetweenThumbs={0}
        disabled={disabled}
        onValueChange={(range) =>
          onChange([Math.min(LAST_MINUTE, range[0] * 15), Math.min(LAST_MINUTE, range[1] * 15)])
        }
      >
        <Slider.Track className="time-range-track">
          <Slider.Range className="time-range-selected" />
        </Slider.Track>
        <Slider.Thumb
          className="time-range-thumb"
          aria-label={`${label} earliest`}
          aria-valuetext={timeLabel(value[0])}
        />
        <Slider.Thumb
          className="time-range-thumb"
          aria-label={`${label} latest`}
          aria-valuetext={timeLabel(value[1])}
        />
      </Slider.Root>
      <div className="time-range-scale" aria-hidden="true">
        <span>00:00</span>
        <span>12:00</span>
        <span>23:59</span>
      </div>
    </div>
  );
}
