import { Badge } from '@radix-ui/themes';
import type { SearchResponse } from '../lib/types';
import { formatDate, formatPrice } from '../lib/format';
import { CarrierLinks } from './CarrierLinks';

export function SearchMetadata({
  metadata,
  currency,
}: {
  metadata: SearchResponse['metadata'];
  currency: string;
}) {
  const insight = metadata.flexibleDateInsight;
  return (
    <div className="search-metadata">
      {(metadata.airlines.length > 0 || metadata.alliances.length > 0) && (
        <details className="metadata">
          <summary>Airlines & alliances</summary>
          <div className="metadata-body">
            {[
              ['Airlines', metadata.airlines],
              ['Alliances', metadata.alliances],
            ].map(
              ([label, entries]) =>
                typeof entries !== 'string' &&
                entries.length > 0 && (
                  <div key={String(label)}>
                    <strong>{String(label)}</strong>
                    <div className="metadata-chips">
                      {entries.map((entry, index) => (
                        <Badge color="gray" key={`${entry.code}-${index}`}>
                          {entry.name || 'Unnamed'} · {entry.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ),
            )}
          </div>
        </details>
      )}
      {metadata.locations?.length > 0 && (
        <details className="metadata">
          <summary>Airports & cities</summary>
          <div className="metadata-scroll">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {metadata.locations.map((location, i) => (
                  <tr key={`${location.code}-${location.kind}-${i}`}>
                    <td>{location.code}</td>
                    <td>
                      {location.name}
                      {location.countryName && ` · ${location.countryName}`}
                    </td>
                    <td>{location.kind}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {metadata.baggageLinks?.length > 0 && (
        <details className="metadata">
          <summary>Baggage policies</summary>
          <div className="carrier-links metadata-scroll">
            <CarrierLinks links={metadata.baggageLinks} label="Baggage" />
          </div>
        </details>
      )}
      {insight && (
        <details className="metadata">
          <summary>
            Flexible dates{insight.destinationLabel && ` · ${insight.destinationLabel}`}
          </summary>
          <p className="metadata-note">Provider estimates · Not narrowed by filters</p>
          {(insight.cheapestPrice !== null || insight.highestPrice !== null) && (
            <p>
              {formatPrice(insight.cheapestPrice ?? 0, currency)} –{' '}
              {formatPrice(insight.highestPrice ?? 0, currency)}
            </p>
          )}
          {insight.pricePoints.length > 0 && (
            <div className="metadata-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {insight.pricePoints.map((point, index) => (
                    <tr key={`${point.epochMs}-${index}`}>
                      <td>{formatDate(point.date)}</td>
                      <td>{formatPrice(point.price, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      )}
    </div>
  );
}
