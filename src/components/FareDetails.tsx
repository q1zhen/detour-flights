import type { Flight } from '../lib/types';
import { CarrierLinks } from './CarrierLinks';

export function FareDetails({ flight }: { flight: Flight }) {
  const baggage = flight.farePolicy?.checkedBaggageIncluded;
  const links = (flight.carrierLinks?.length || 0) + (flight.baggageLinks?.length || 0);
  if (typeof baggage !== 'boolean' && !links) return null;
  return (
    <details className="fare-details">
      <summary>Baggage & airline information</summary>
      <div className="fare-details-body">
        {typeof baggage === 'boolean' && (
          <span>
            Checked baggage {baggage ? 'included' : 'not included'} · Confirm with airline
          </span>
        )}
        <div className="carrier-links">
          <CarrierLinks links={flight.baggageLinks ?? []} label="Baggage" />
          <CarrierLinks links={flight.carrierLinks ?? []} label="Support" />
        </div>
      </div>
    </details>
  );
}
