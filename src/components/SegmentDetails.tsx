import { ArrowRightIcon } from '@radix-ui/react-icons';
import type { Segment } from '../lib/types';
import { formatDate, formatDuration, formatTime } from '../lib/format';

export function SegmentDetails({ segment, index }: { segment: Segment; index: number }) {
  return (
    <div className="segment">
      <div className="segment-index">{index + 1}</div>
      <div className="segment-body">
        <div className="segment-airports">
          <strong>{segment.from_airport?.code || '—'}</strong>
          <ArrowRightIcon />
          <strong>{segment.to_airport?.code || '—'}</strong>
          <span>{formatDuration(segment.duration)}</span>
        </div>
        <p>
          {segment.from_airport?.name || 'Departure airport unavailable'} →{' '}
          {segment.to_airport?.name || 'Arrival airport unavailable'}
        </p>
        <div className="segment-times">
          <span>
            Departs <strong>{formatTime(segment.departure)}</strong> ·{' '}
            {formatDate(segment.departure?.date)}
          </span>
          <span>
            Arrives <strong>{formatTime(segment.arrival)}</strong> ·{' '}
            {formatDate(segment.arrival?.date)}
          </span>
        </div>
        <span className="muted">{segment.plane_type || 'Aircraft unavailable'}</span>
      </div>
    </div>
  );
}
