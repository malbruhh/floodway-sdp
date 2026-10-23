import { useCallback, useEffect, useState } from 'react';
import { fetchForecast } from '../services/api';
import type { ForecastResponse } from '../services/api';

export type ForecastState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: ForecastResponse };

/** Loads the forecast once and exposes a retry. No fallback numbers: failure is an `error` state. */
export function useForecast(liveRain = false): { state: ForecastState; retry: () => void } {
  const [state, setState] = useState<ForecastState>({ status: 'loading' });
  const load = useCallback(() => {
    setState({ status: 'loading' });
    void fetchForecast(liveRain).then((data) => setState(data ? { status: 'ready', data } : { status: 'error' }));
  }, [liveRain]);
  useEffect(load, [load]);
  return { state, retry: load };
}
