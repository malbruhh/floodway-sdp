import { useEffect, useState } from 'react';
import { fetchResilienceSummary } from '../services/resilience';
import type { ResilienceSummary } from '../types/resilience';

const POLL_MS = 30_000;

export type ResilienceState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: ResilienceSummary };

/** Polls the summary. A failed poll replaces the numbers with an error state rather than leaving stale ones on screen. */
export function useResilience(windowH: number): ResilienceState {
  const [state, setState] = useState<ResilienceState>({ status: 'loading' });

  useEffect(() => {
    const ctl = new AbortController();
    setState({ status: 'loading' });
    const load = () =>
      fetchResilienceSummary(windowH, ctl.signal).then((data) => {
        if (!ctl.signal.aborted) setState(data ? { status: 'ready', data } : { status: 'error' });
      });
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => {
      ctl.abort();
      clearInterval(t);
    };
  }, [windowH]);

  return state;
}
