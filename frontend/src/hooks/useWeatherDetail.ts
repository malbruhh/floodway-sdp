import { useEffect, useState } from 'react';
import { fetchWeatherDetail, type WeatherDetail } from '../services/weather';

export type DetailState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: WeatherDetail };

/** Weather for the one focused camera. Refetches when the camera changes; the backend caches for 5 minutes. */
export function useWeatherDetail(lat: number, lon: number): DetailState {
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  useEffect(() => {
    const ctl = new AbortController();
    setState({ status: 'loading' });
    fetchWeatherDetail(lat, lon, ctl.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch(() => !ctl.signal.aborted && setState({ status: 'error' }));
    return () => ctl.abort();
  }, [lat, lon]);
  return state;
}
