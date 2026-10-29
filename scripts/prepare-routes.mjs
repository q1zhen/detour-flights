import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_URL =
  'https://raw.githubusercontent.com/Jonty/airline-route-data/refs/heads/main/airline_routes.json';

// Offline and deterministic: never fetch or modify the original snapshot.
export function prepareRoutes(bytes) {
  const raw = JSON.parse(bytes.toString());
  if (!raw || Array.isArray(raw) || typeof raw !== 'object' || !Object.keys(raw).length)
    throw new Error('Expected a nonempty object keyed by IATA airport code.');
  const airports = {};
  const excluded = [];
  for (const [code, airport] of Object.entries(raw).sort(([a], [b]) => a.localeCompare(b))) {
    let reason;
    const lat = Number(airport?.latitude);
    const lon = Number(airport?.longitude);
    if (!/^[A-Z]{3}$/.test(code) || airport?.iata !== code) reason = 'invalid IATA code';
    else if (
      airport.latitude == null ||
      airport.latitude === '' ||
      airport.longitude == null ||
      airport.longitude === '' ||
      !Number.isFinite(lat) ||
      Math.abs(lat) > 90 ||
      !Number.isFinite(lon) ||
      Math.abs(lon) > 180
    )
      reason = 'invalid coordinates';
    else {
      try {
        if (!airport.timezone) throw new Error();
        new Intl.DateTimeFormat('en', { timeZone: airport.timezone }).format(0);
      } catch {
        reason = 'missing or invalid timezone';
      }
    }
    if (!reason && !Array.isArray(airport.routes)) reason = 'invalid routes';
    if (reason) {
      excluded.push({ code, reason });
      continue;
    }
    airports[code] = {
      name: airport.name || code,
      city: airport.city_name || '',
      country: airport.country_code || '',
      lat,
      lon,
      timezone: airport.timezone,
      out: [],
      in: [],
    };
  }
  let droppedRoutes = 0;
  let routeCount = 0;
  for (const [code, airport] of Object.entries(airports)) {
    const destinations = new Set();
    for (const route of raw[code].routes) {
      if (!airports[route?.iata] || route.iata === code || destinations.has(route.iata)) {
        droppedRoutes++;
        continue;
      }
      destinations.add(route.iata);
    }
    airport.out = [...destinations].sort();
    for (const destination of airport.out) airports[destination].in.push(code);
    routeCount += airport.out.length;
  }
  if (!Object.keys(airports).length || !routeCount)
    throw new Error('No usable airports/routes remain; refusing to overwrite the prepared graph.');
  return {
    version: 1,
    source: { url: SOURCE_URL, sha256: createHash('sha256').update(bytes).digest('hex') },
    stats: {
      rawAirports: Object.keys(raw).length,
      airports: Object.keys(airports).length,
      routes: routeCount,
      droppedRoutes,
      excluded,
    },
    airports,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = resolve(process.argv[2] || 'data/raw/airline_routes.json');
  const output = resolve(process.argv[3] || 'public/data/routes.json');
  if (input === output) throw new Error('The prepared graph must not overwrite the raw snapshot.');
  const graph = prepareRoutes(await readFile(input));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(graph) + '\n');
  console.log(JSON.stringify(graph.stats, null, 2));
}
