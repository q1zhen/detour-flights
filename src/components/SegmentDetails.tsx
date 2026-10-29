import type { Segment } from '../lib/types';
import { formatDate, formatDuration, formatTime } from '../lib/format';

export function SegmentDetails({ segment }: { segment: Segment }) {
  return (
    <div className="segment-timeline">
      <div className="timeline-point">
        <span className="timeline-time">
          <strong>{formatTime(segment.departure)}</strong>
          <span>{formatDate(segment.departure?.date)}</span>
        </span>
        <span className="timeline-airport">
          <strong>{segment.from_airport?.code || '—'}</strong>
          <span>{segment.from_airport?.name || 'Airport unavailable'}</span>
        </span>
      </div>
      <div className="timeline-flight">
        <span>{formatDuration(segment.duration)}</span>
        {segment.plane_type && <span>{segment.plane_type}</span>}
      </div>
      <div className="timeline-point">
        <span className="timeline-time">
          <strong>{formatTime(segment.arrival)}</strong>
          <span>{formatDate(segment.arrival?.date)}</span>
        </span>
        <span className="timeline-airport">
          <strong>{segment.to_airport?.code || '—'}</strong>
          <span>{segment.to_airport?.name || 'Airport unavailable'}</span>
        </span>
      </div>
    </div>
  );
}
