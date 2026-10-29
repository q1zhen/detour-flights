import { useEffect, useRef, useState } from 'react';
import type { GlobeInstance } from 'globe.gl';
import { routeView } from '../lib/globe';
import type { AirportDot, RouteArc } from '../lib/globe';
import type { TransferProgress } from '../lib/self-transfer';

function tooltip(item: AirportDot) {
  const el = document.createElement('div');
  el.className = 'airport-tooltip';
  const title = document.createElement('strong');
  title.textContent = item.code;
  const detail = document.createElement('span');
  detail.textContent = `${item.name} · ${item.status}`;
  el.append(title, detail);
  return el;
}
export default function FlightGlobe({
  dots,
  airports,
  arcs,
  focusKey,
  progress,
  dataError,
  missing,
  loading = false,
  cancelled = false,
  searchFailed = false,
  retryCount = 0,
  retryMessage,
}: {
  dots: AirportDot[];
  airports: AirportDot[];
  arcs: RouteArc[];
  focusKey: string;
  progress: TransferProgress | null;
  dataError: string | null;
  missing: string[];
  loading?: boolean;
  cancelled?: boolean;
  searchFailed?: boolean;
  retryCount?: number;
  retryMessage?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeInstance | null>(null);
  const latest = useRef({ dots, airports, arcs });
  latest.current = { dots, airports, arcs };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspected, setInspected] = useState<string | null>(null);
  const inspect = [...dots, ...airports].find((a) => a.code === inspected);
  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | undefined;
    const abort = new AbortController();
    import('globe.gl')
      .then(({ default: Globe }) => {
        if (disposed || !host.current) return;
        const g = new Globe(host.current, {
          animateIn: false,
          rendererConfig: { antialias: true, alpha: true },
        });
        globe.current = g;
        g.backgroundColor('#080f1d')
          .showAtmosphere(true)
          .atmosphereColor('#408dc8')
          .atmosphereAltitude(0.13)
          .showGraticules(true)
          .polygonCapColor(() => '#19384d')
          .polygonSideColor(() => '#19384d')
          .polygonStrokeColor(() => '#31566a')
          // Fine caps stay above the globe instead of intersecting its mesh.
          .polygonCapCurvatureResolution(1)
          .polygonAltitude(0.006)
          .polygonsTransitionDuration(0)
          .polygonLabel(() => '')
          .pointLat('lat')
          .pointLng('lng')
          .pointColor('color')
          .pointAltitude(0.012)
          .pointRadius((d) => ((d as AirportDot).selected ? 0.38 : 0.27))
          .pointsTransitionDuration(0)
          .pointLabel((d) => tooltip(d as AirportDot))
          .onPointClick((d) => setInspected((d as AirportDot).code))
          .labelLat('lat')
          .labelLng('lng')
          .labelText('code')
          .labelSize(1.2)
          .labelColor('color')
          .labelDotRadius(0)
          .labelAltitude(0.022)
          .labelResolution(3)
          .labelsTransitionDuration(0)
          .labelLabel((d) => tooltip(d as AirportDot))
          .onLabelClick((d) => setInspected((d as AirportDot).code))
          .arcStartLat('startLat')
          .arcStartLng('startLng')
          .arcEndLat('endLat')
          .arcEndLng('endLng')
          .arcColor('color')
          .arcStroke(0.65)
          .arcAltitudeAutoScale(0.28)
          .arcDashLength((d) => ((d as RouteArc).ground ? 0.1 : 0.65))
          .arcDashGap((d) => ((d as RouteArc).ground ? 0.06 : 0.18))
          .arcDashAnimateTime(
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2400,
          )
          .arcsTransitionDuration(0)
          .arcLabel((d) => {
            const el = document.createElement('span');
            el.textContent = (d as RouteArc).label;
            return el;
          });
        const material = g.globeMaterial();
        // The library's default sphere material is a MeshPhongMaterial.
        if ('color' in material)
          (material.color as { set: (color: string) => void }).set('#0e2032');
        const controls = g.controls();
        controls.enablePan = false;
        controls.minDistance = 125;
        controls.maxDistance = 650;
        g.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));
        resize = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect;
          g.width(width)
            .height(height)
            .globeOffset(width >= 850 ? [Math.min(340, width * 0.23), 15] : [0, height * 0.22]);
        });
        resize.observe(host.current);
        g.pointOfView(routeView(latest.current.airports));
        setReady(true);
        fetch(`${import.meta.env.BASE_URL}data/land.geojson`, { signal: abort.signal })
          .then((r) => {
            if (!r.ok) throw new Error();
            return r.json();
          })
          .then((data) => {
            if (!disposed) g.polygonsData(data.features);
          })
          .catch(() => {
            if (!disposed) setError('Land map unavailable. Airport data is still shown.');
          });
      })
      .catch(() => {
        if (!disposed) setError('3D globe unavailable. Flight search is still available.');
      });
    return () => {
      disposed = true;
      abort.abort();
      resize?.disconnect();
      globe.current?._destructor();
      globe.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !globe.current) return;
    const routeCodes = new Set(airports.map((a) => a.code));
    // Preserve midpoint status colours even when the selected route visits one.
    const points = [
      ...dots.map((dot) => ({ ...dot, selected: routeCodes.has(dot.code) })),
      ...airports.filter((a) => !dots.some((d) => d.code === a.code)),
    ];
    globe.current.pointsData(points).labelsData(airports).arcsData(arcs);
  }, [ready, dots, airports, arcs]);
  useEffect(() => {
    if (ready)
      globe.current?.pointOfView(
        routeView(latest.current.airports),
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900,
      );
  }, [ready, focusKey]);
  const finished =
    progress?.midpoints.filter((h) => ['results', 'empty', 'pruned', 'error'].includes(h.status))
      .length ?? 0;
  const total = progress?.midpoints.length ?? dots.length;
  const isCancelled = cancelled || progress?.phase === 'cancelled';
  const complete = progress?.phase === 'complete';
  const percent = total ? Math.floor((finished / total) * 100) : complete ? 100 : 0;
  const phaseLabel = retryCount
    ? `Retrying ${retryCount} ${retryCount === 1 ? 'search' : 'searches'}…`
    : isCancelled
      ? 'Cancelled'
      : searchFailed
        ? 'Search unavailable'
        : complete
          ? 'Complete'
          : loading && !progress
            ? 'Regular flights…'
            : progress
              ? 'Searching midpoints…'
              : 'Ready to search';
  return (
    <section className="globe-stage" aria-label="Flight route globe">
      <div
        className="globe-canvas"
        ref={host}
        aria-label="Interactive globe. Drag to rotate; scroll to zoom."
      />
      <div className="globe-heading">
        <span className="eyebrow">ROUTE EXPLORER</span>
        <strong>
          {airports.length ? airports.map((a) => a.code).join(' → ') : 'A world of connections'}
        </strong>
      </div>
      <div className="globe-controls">
        <button type="button" onClick={() => globe.current?.pointOfView(routeView(airports), 700)}>
          Recenter
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => {
            const g = globe.current;
            if (g) g.pointOfView({ altitude: Math.max(0.3, g.pointOfView().altitude * 0.8) }, 300);
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => {
            const g = globe.current;
            if (g) g.pointOfView({ altitude: Math.min(5, g.pointOfView().altitude * 1.25) }, 300);
          }}
        >
          −
        </button>
      </div>
      <div className="globe-status">
        <div className="globe-status-heading">
          <strong>Search progress</strong>
          <span className="search-percent">{loading && !progress ? '…' : `${percent}%`}</span>
        </div>
        <progress
          aria-label="Search progress"
          max={total || 1}
          value={loading && !progress ? undefined : total ? finished : complete ? 1 : 0}
          aria-valuetext={loading && !progress ? phaseLabel : `${percent}% · ${phaseLabel}`}
        />
        <div className="search-progress-detail" role="status">
          <span title={retryMessage}>{phaseLabel}</span>
          <span>{progress ? `${finished}/${total} midpoints` : `${dots.length} candidates`}</span>
        </div>
        {(error || dataError || missing.length > 0) && (
          <p role="status">
            {error || dataError || `Coordinates unavailable: ${missing.join(', ')}`}
          </p>
        )}
        {!ready && !error && <p role="status">Loading globe…</p>}
        <div className="globe-inspector">
          <select
            aria-label="Inspect midpoint"
            value={dots.some((dot) => dot.code === inspected) ? inspected! : ''}
            onChange={(e) => {
              setInspected(e.target.value || null);
              const dot = dots.find((d) => d.code === e.target.value);
              if (dot)
                globe.current?.pointOfView({ lat: dot.lat, lng: dot.lng, altitude: 1.2 }, 700);
            }}
          >
            <option value="">Inspect an airport</option>
            {dots.map((dot) => (
              <option value={dot.code} key={dot.code}>
                {dot.code} · {dot.status}
              </option>
            ))}
          </select>
          {inspect && (
            <span style={{ color: inspect.color }}>
              {inspect.code} · {inspect.status}
            </span>
          )}
        </div>
        <a
          className="project-link"
          href="https://github.com/q1zhen/detour-flights"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub · q1zhen/detour-flights ↗
        </a>
      </div>
    </section>
  );
}
