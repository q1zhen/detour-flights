import type { Segment } from '../lib/types';
import { formatDate, formatDuration, formatTime } from '../lib/format';

export function SegmentDetails({
  segment,
  first = false,
  last = false,
}: {
  segment: Segment;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <>
      <li className={`timeline-point ${first ? 'timeline-start' : ''}`}>
        <span className="timeline-time">
          <strong>{formatTime(segment.departure)}</strong>
          <span>{formatDate(segment.departure?.date)}</span>
        </span>
        <span className="timeline-airport">
          <strong>{segment.from_airport?.code || '—'}</strong>
          <span>{segment.from_airport?.name || 'Airport unavailable'}</span>
        </span>
      </li>
      <li className="timeline-flight">
        <span>{formatDuration(segment.duration)} flight</span>
        {segment.plane_type && <span>{segment.plane_type}</span>}
      </li>
      <li className={`timeline-point ${last ? 'timeline-end' : ''}`}>
        <span className="timeline-time">
          <strong>{formatTime(segment.arrival)}</strong>
          <span>{formatDate(segment.arrival?.date)}</span>
        </span>
        <span className="timeline-airport">
          <strong>{segment.to_airport?.code || '—'}</strong>
          <span>{segment.to_airport?.name || 'Airport unavailable'}</span>
        </span>
      </li>
    </>
  );
}
