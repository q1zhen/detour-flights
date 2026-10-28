import { useEffect, useState } from 'react';
import { ArrowTopRightIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import { API_URL } from '../lib/api';

export function AppHeader() {
  const [status, setStatus] = useState<'checking' | 'online' | 'unavailable'>('checking');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/health`, {
      credentials: 'omit',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!controller.signal.aborted)
          setStatus(response.ok && data.ok ? 'online' : 'unavailable');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('unavailable');
      });
    return () => controller.abort();
  }, []);
  return (
    <header className="app-header">
      <a className="brand" href="/" aria-label="Detour home">
        <span className="brand-icon">
          <PaperPlaneIcon width="22" height="22" />
        </span>
        detour<span className="brand-period">.</span>
      </a>
      <nav aria-label="Main navigation">
        <span className="nav-active">Flight search</span>
        <a href={API_URL} target="_blank" rel="noopener noreferrer">
          API docs
          <ArrowTopRightIcon />
        </a>
      </nav>
      <div className={`service-status ${status}`}>
        <span />
        {status === 'checking'
          ? 'Connecting'
          : status === 'online'
            ? 'Flight service online'
            : 'Service status unavailable'}
      </div>
    </header>
  );
}
