import type { Segment } from '../lib/types';
import { arrivalDayOffset, formatTime, formatDuration } from '../lib/format';

export function FlightDirection({
  segments,
  selfTransferIndex,
  durationMinutes = Infinity,
  connectionDurations = [],
}: {
  segments: Segment[];
  selfTransferIndex?: number;
  durationMinutes?: number;
  connectionDurations?: (number | undefined)[];
}) {
  const first = segments[0];
  const last = segments.at(-1);
  const offset = arrivalDayOffset(first?.departure, last?.arrival);
  const connections = segments.slice(0, -1);
  return (
    <span
      className={`flight-route${selfTransferIndex !== undefined ? ' self-transfer-route' : ''}${connections.length ? '' : ' nonstop-route'}`}
    >
      <span className="route-overview">
        {segments.length
          ? connections.length
            ? `${connections.length} ${connections.length === 1 ? 'stop' : 'stops'}`
            : 'Nonstop'
          : 'Stops unavailable'}
        {' · '}
        {formatDuration(durationMinutes)}
      </span>
      <span className="route-endpoint">
        <strong>{formatTime(first?.departure)}</strong>
        <span className="sr-only">{first?.fromAirport?.code || '—'}</span>
      </span>
      <span className="route-track">
        <span className="route-path" aria-hidden="true">
          <span className="endpoint-marker">
            <i className="endpoint-dot" />
            <span>{first?.fromAirport?.code || '—'}</span>
          </span>
          {connections.map((segment, index) => (
            <span
              className={`connection-marker${index === selfTransferIndex ? ' self-transfer-marker' : ''}`}
              key={index}
            >
              {index === selfTransferIndex && <em>Self-transfer</em>}
              <i />
              <span>
                {segment.toAirport?.code || '—'}
                <small className="connection-duration">
                  {typeof connectionDurations[index] === 'number' &&
                  connectionDurations[index]! >= 0
                    ? connectionDurations[index] === 0
                      ? '0m'
                      : formatDuration(connectionDurations[index]!)
                    : '—'}
                </small>
              </span>
            </span>
          ))}
          <span className="endpoint-marker">
            <i className="endpoint-dot" />
            <span>{last?.toAirport?.code || '—'}</span>
          </span>
        </span>
        {connections.length > 0 && (
          <span className="sr-only">
            via{' '}
            {connections
              .map(
                (segment, index) =>
                  `${segment.toAirport?.code || 'unknown airport'}${index === selfTransferIndex ? ' (self-transfer)' : ''} · ${formatDuration(connectionDurations[index] ?? Infinity)} layover`,
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
        <span className="sr-only">{last?.toAirport?.code || '—'}</span>
      </span>
    </span>
  );
}
