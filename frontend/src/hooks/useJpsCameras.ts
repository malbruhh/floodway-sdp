import { useEffect, useState } from 'react';
import type { JpsCameraList } from '../lib/jps';
import { fetchJpsCameras } from '../services/jps';

const POLL_MS = 120_000; // JPS rewrites each snapshot every 1 to 2 minutes; the backend caches for 2

export interface JpsState {
  data: JpsCameraList | null;
  loading: boolean;
  error: string | null;
}

export function useJpsCameras(): JpsState {
  const [state, setState] = useState<JpsState>({ data: null, loading: true, error: null });

  useEffect(() => {
    const ctl = new AbortController();
    const load = () =>
      fetchJpsCameras(ctl.signal)
        .then((data) => setState({ data, loading: false, error: null }))
        .catch((e: unknown) => {
          if (ctl.signal.aborted) return;
          // keep the last good list on screen; only say what failed
          setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Cannot reach the server' }));
        });
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => {
      ctl.abort();
      clearInterval(t);
    };
  }, []);

  return state;
}
