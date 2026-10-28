import { useEffect, useRef, useState } from 'react';
import { Callout } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { AppHeader } from './components/AppHeader';
import { SearchForm } from './components/SearchForm';
import { FlightResults } from './components/FlightResults';
import { SearchError, searchFlights } from './lib/api';
import type { SearchRequest, SearchResponse } from './lib/types';

export default function App() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [request, setRequest] = useState<SearchRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SearchError | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function search(next: SearchRequest) {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setLoading(true); setError(null); setCancelled(false); setData(null); setRequest(next);
    try { const result = await searchFlights(next, active.signal); if (!active.signal.aborted) setData(result); }
    catch (failure) { if (!active.signal.aborted) setError(failure instanceof SearchError ? failure : new SearchError('Something went wrong. Please try again.')); }
    finally { if (controller.current === active) setLoading(false); }
  }
  return <div className="app-shell">
    <AppHeader />
    <main id="main-content">
      <section className="hero"><div className="eyebrow"><span /> GO A LITTLE FURTHER</div><h1>Good trips start<br className="mobile-break" /> with a little <span>detour.</span></h1><p>Find your flight. Make room for the unexpected.</p><div className="hero-orbit" aria-hidden="true"><div /><span>✦</span></div></section>
      <SearchForm onSearch={search} loading={loading} onCancel={() => { controller.current?.abort(); setLoading(false); setCancelled(true); }} />
      {error && <Callout.Root className="search-error" color="red" role="alert"><Callout.Icon><ExclamationTriangleIcon /></Callout.Icon><Callout.Text><strong>{error.message}</strong>{error.issues.length > 0 && <ul>{error.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>}<span className="error-help">Your search settings are saved above. Adjust them or try searching again.</span></Callout.Text></Callout.Root>}
      {cancelled && <p role="status" className="cancelled-message">Search cancelled. Your settings are ready when you are.</p>}
      {!error && <FlightResults data={data} request={request} loading={loading} />}
    </main>
    <footer><span className="footer-brand">detour.</span><p>Less searching. More going.</p><span>Flight data via <a href="https://gflight.q1z.dev" target="_blank" rel="noopener noreferrer">gflight</a> · Booking on Google Flights</span></footer>
  </div>;
}
