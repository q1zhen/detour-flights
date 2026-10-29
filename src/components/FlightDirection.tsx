import type { Segment } from '../lib/types';
import { arrivalDayOffset, formatTime } from '../lib/format';

export function FlightDirection({
  segments,
  selfTransferIndex,
}: {
  segments: Segment[];
  selfTransferIndex?: number;
}) {
  const first = segments[0];
  const last = segments.at(-1);
  const offset = arrivalDayOffset(first?.departure, last?.arrival);
  const connections = segments.slice(0, -1);
  return (
    <span
      className={`flight-route${selfTransferIndex !== undefined ? ' self-transfer-route' : ''}`}
    >
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
            <span
              className={`connection-marker${index === selfTransferIndex ? ' self-transfer-marker' : ''}`}
              key={index}
            >
              <i />
              <span>
                {segment.toAirport?.code || '—'}
                {index === selfTransferIndex && <em>Self-transfer</em>}
              </span>
            </span>
          ))}
          <i className="endpoint-dot" />
        </span>
        {connections.length > 0 && (
          <span className="sr-only">
            via{' '}
            {connections
              .map(
                (segment, index) =>
                  `${segment.toAirport?.code || 'unknown airport'}${index === selfTransferIndex ? ' (self-transfer)' : ''}`,
              )
              .join(', ')}
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
