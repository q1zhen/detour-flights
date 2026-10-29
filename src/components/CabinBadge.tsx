import type { Cabin } from '../lib/types';

const labels: Record<Cabin, string> = {
  economy: 'Economy',
  'premium-economy': 'Premium economy',
  business: 'Business',
  first: 'First class',
};
// Upstream does not return per-segment cabins; retain the cabin used to price
// this ticket, rather than infer it from current form values or airline names.
export function CabinBadge({ cabin, ticket }: { cabin: Cabin; ticket?: 1 | 2 }) {
  return (
    <span
      className="cabin-badge"
      title="Requested cabin class"
      aria-label={`${ticket ? `Ticket ${ticket} · ` : ''}Cabin class: ${labels[cabin]}`}
    >
      {ticket && <b>{ticket}</b>}
      {labels[cabin]}
    </span>
  );
}
