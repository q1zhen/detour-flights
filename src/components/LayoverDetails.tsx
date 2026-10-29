import type { Segment } from '../lib/types';
import { formatDuration } from '../lib/format';
import { layoverMinutes } from '../lib/layover';

export function LayoverDetails({ previous, next }: { previous: Segment; next: Segment }) {
  const airport = previous.to_airport?.code;
  const nextAirport = next.from_airport?.code;
  const sameAirport = Boolean(
    airport && nextAirport && airport.toUpperCase() === nextAirport.toUpperCase(),
  );
  const minutes = layoverMinutes(previous, next);
  return (
    <li className="timeline-layover">
      <div className="layover-label">
        <strong>
          {minutes === null
            ? 'Duration unavailable'
            : minutes === 0
              ? '0m'
              : formatDuration(minutes)}{' '}
          {sameAirport ? 'layover' : 'transfer'}
        </strong>
        <span>{sameAirport ? airport : `${airport || '—'} → ${nextAirport || '—'}`}</span>
      </div>
    </li>
  );
}
