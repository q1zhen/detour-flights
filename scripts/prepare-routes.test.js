import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { prepareRoutes } from './prepare-routes.mjs';

const airport = (iata, routes = [], overrides = {}) => ({
  iata,
  latitude: '0',
  longitude: '12.5',
  timezone: 'Etc/UTC',
  routes: routes.map((iata) => ({ iata })),
  ...overrides,
});
describe('offline route preparation', () => {
  it('normalizes coordinates, deduplicates edges, reverses directed edges and reports exclusions', () => {
    const bytes = Buffer.from(
      JSON.stringify({
        AAA: airport('AAA', ['BBB', 'BBB', 'AAA', 'CCC', 'ZZZ']),
        BBB: airport('BBB'),
        CCC: airport('CCC', [], { timezone: '' }),
        DDD: airport('DDD', [], { latitude: '' }),
      }),
    );
    const graph = prepareRoutes(bytes);
    expect(graph.airports.AAA).toMatchObject({ lat: 0, lon: 12.5, out: ['BBB'], in: [] });
    expect(graph.airports.BBB).toMatchObject({ out: [], in: ['AAA'] });
    expect(graph.stats).toMatchObject({ airports: 2, routes: 1, droppedRoutes: 4 });
    expect(graph.stats.excluded).toHaveLength(2);
    expect(prepareRoutes(bytes)).toEqual(graph);
  });
  it('reproduces the checked-in graph from the untouched raw snapshot', () => {
    const bytes = readFileSync('data/raw/airline_routes.json');
    const graph = JSON.parse(readFileSync('public/data/routes.json', 'utf8'));
    expect(prepareRoutes(bytes)).toEqual(graph);
    for (const [code, airport] of Object.entries(graph.airports)) {
      for (const destination of airport.out) expect(graph.airports[destination].in).toContain(code);
    }
  });
  it('rejects unusable input', () => {
    expect(() => prepareRoutes(Buffer.from('{}'))).toThrow();
    expect(() => prepareRoutes(Buffer.from('{"AAA":null}'))).toThrow();
  });
});
