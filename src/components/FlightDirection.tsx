import { ArrowRightIcon } from '@radix-ui/react-icons';
import type { Segment } from '../lib/types';
import {
  arrivalDayOffset,
  formatDate,
  formatDuration,
  formatTime,
  segmentMinutes,
} from '../lib/format';

export function FlightDirection({ label, segments }: { label: string; segments: Segment[] }) {
  const first = segments[0];
  const last = segments.at(-1);
  const dayOffset = arrivalDayOffset(first?.departure, last?.arrival);
  return (
    <section className="flight-direction" aria-label={`${label} flight summary`}>
      <div className="direction-heading">
        <strong>{label}</strong>
        <span>{formatDate(first?.departure?.date)}</span>
        <span>{formatDuration(segmentMinutes(segments))}</span>
      </div>
      {segments.length ? (
        <div className="flight-route">
          <div className="flight-time">
            <strong>{formatTime(first?.departure)}</strong>
            <span>{first?.from_airport?.code || '—'}</span>
          </div>
          <div className="route-line">
            <span>
              {segments.length === 1
                ? 'Nonstop'
                : `${segments.length - 1} ${segments.length === 2 ? 'stop' : 'stops'}`}
            </span>
            <div className="route-line-art">
              <i />
              <ArrowRightIcon />
            </div>
            <small>
              {segments
                .slice(0, -1)
                .map((segment) => segment.to_airport?.code)
                .filter(Boolean)
                .join(' · ')}
            </small>
          </div>
          <div className="flight-time">
            <strong>
              {formatTime(last?.arrival)}
              {dayOffset && <sup aria-label={`Arrival date offset ${dayOffset}`}>{dayOffset}</sup>}
            </strong>
            <span>{last?.to_airport?.code || '—'}</span>
          </div>
        </div>
      ) : (
        <p className="muted">{label} details unavailable</p>
      )}
    </section>
  );
}
