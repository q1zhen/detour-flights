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
          <strong>{segment.fromAirport?.code || '—'}</strong>
          <span>{segment.fromAirport?.name || 'Airport unavailable'}</span>
        </span>
      </li>
      <li className="timeline-flight">
        <span>{formatDuration(segment.durationMinutes)} flight</span>
        {(segment.flightNumber || segment.operatingCarrier) && (
          <span>{segment.flightNumber || segment.operatingCarrier}</span>
        )}
        {segment.planeType && <span>{segment.planeType}</span>}
        {segment.legroom && <span>{segment.legroom} legroom</span>}
      </li>
      <li className={`timeline-point ${last ? 'timeline-end' : ''}`}>
        <span className="timeline-time">
          <strong>{formatTime(segment.arrival)}</strong>
          <span>{formatDate(segment.arrival?.date)}</span>
        </span>
        <span className="timeline-airport">
          <strong>{segment.toAirport?.code || '—'}</strong>
          <span>{segment.toAirport?.name || 'Airport unavailable'}</span>
        </span>
      </li>
    </>
  );
}
