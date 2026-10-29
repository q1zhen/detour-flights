import type { CarrierLink } from '../lib/types';
import { carrierUrl } from '../lib/format';

export function CarrierLinks({ links, label }: { links: CarrierLink[]; label: string }) {
  return (
    <>
      {links.map((link, index) => {
        const url = carrierUrl(link.url);
        return url ? (
          <a key={`${link.code}-${index}`} href={url} target="_blank" rel="noopener noreferrer">
            {link.name || link.code} · {label} ↗
          </a>
        ) : null;
      })}
    </>
  );
}
