import type { Layover, Segment } from '../lib/types';
import { formatDuration } from '../lib/format';

export function LayoverDetails({
  layover,
  previous,
  next,
}: {
  layover?: Layover;
  previous: Segment;
  next: Segment;
}) {
  const airport = layover?.airportCode || previous.toAirport?.code;
  const nextAirport = next.fromAirport?.code;
  const transfer = layover?.changeOfAirport || (airport && nextAirport && airport !== nextAirport);
  const minutes = layover?.durationMinutes;
  return (
    <li className="timeline-layover">
      <div className="layover-label">
        <strong>
          {typeof minutes === 'number' && minutes > 0
            ? formatDuration(minutes)
            : 'Duration unavailable'}{' '}
          {transfer ? 'transfer' : 'layover'}
        </strong>
        <span>
          {transfer
            ? `${airport || '—'} → ${nextAirport || '—'} · Change airports`
            : airport || 'Airport unavailable'}
        </span>
      </div>
    </li>
  );
}
