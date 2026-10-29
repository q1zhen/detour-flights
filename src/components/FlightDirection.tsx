import type { Segment } from '../lib/types';
import { arrivalDayOffset, formatTime } from '../lib/format';

export function FlightDirection({ segments }: { segments: Segment[] }) {
  const first = segments[0];
  const last = segments.at(-1);
  const offset = arrivalDayOffset(first?.departure, last?.arrival);
  const connections = segments.slice(0, -1);
  return (
    <span className="flight-route">
      <span className="route-endpoint">
        <strong>{formatTime(first?.departure)}</strong>
        <span>{first?.fromAirport?.code || '—'}</span>
      </span>
      <span className="route-track">
        <span className="stop-label">
          {segments.length
            ? connections.length
              ? `${connections.length} ${connections.length === 1 ? 'stop' : 'stops'}`
              : 'Nonstop'
            : 'Stops unavailable'}
        </span>
        <span className="route-path" aria-hidden="true">
          <i className="endpoint-dot" />
          {connections.map((segment, index) => (
            <span className="connection-marker" key={index}>
              <i />
              <span>{segment.toAirport?.code || '—'}</span>
            </span>
          ))}
          <i className="endpoint-dot" />
        </span>
        {connections.length > 0 && (
          <span className="sr-only">
            via{' '}
            {connections.map((segment) => segment.toAirport?.code || 'unknown airport').join(', ')}
          </span>
        )}
      </span>
      <span className="route-endpoint route-arrival">
        <strong>
          {formatTime(last?.arrival)}
          {offset && <sup aria-label={`Arrival date offset ${offset}`}>{offset}</sup>}
        </strong>
        <span>{last?.toAirport?.code || '—'}</span>
      </span>
    </span>
  );
}
