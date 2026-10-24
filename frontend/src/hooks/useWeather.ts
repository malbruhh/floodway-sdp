import { useEffect, useState } from 'react';
import { fetchWeather, weatherKey, type PointWeather } from '../services/weather';

const POLL_MS = 300_000; // the backend caches for 5 minutes

/** Weather per place, keyed by weatherKey(lat, lon). Keeps the last good answer if a refresh fails. */
export function useWeather(points: { lat: number; lon: number }[]): Record<string, PointWeather> {
  const [data, setData] = useState<Record<string, PointWeather>>({});
  const sig = Array.from(new Set(points.map((p) => weatherKey(p.lat, p.lon)))).sort().join(';');

  useEffect(() => {
    if (!sig) return;
    const ctl = new AbortController();
    const pts = sig.split(';').map((k) => ({ lat: Number(k.split(',')[0]), lon: Number(k.split(',')[1]) }));
    const load = () => void fetchWeather(pts, ctl.signal).then((d) => setData((old) => ({ ...old, ...d }))).catch(() => undefined);
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      ctl.abort();
      clearInterval(t);
    };
  }, [sig]);

  return data;
}
