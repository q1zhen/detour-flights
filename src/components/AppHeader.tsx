import { useEffect, useState } from 'react';
import { PaperPlaneIcon } from '@radix-ui/react-icons';
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
      <div className={`service-status ${status}`}>
        <span />
        {status === 'checking'
          ? 'Connecting'
          : status === 'online'
            ? 'Live'
            : 'Service unavailable'}
      </div>
    </header>
  );
}
