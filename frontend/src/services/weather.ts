import { API_BASE } from './vision/config';

export interface PointWeather {
  rate_mm_hr: number;
  temp_c: number | null;
  observed_at: string | null;
  source: string;
}

export const weatherKey = (lat: number, lon: number): string => `${lat.toFixed(2)},${lon.toFixed(2)}`;

/** Rain and temperature for many places in one backend call. Missing or failed points are simply absent. */
export async function fetchWeather(points: { lat: number; lon: number }[], signal?: AbortSignal): Promise<Record<string, PointWeather>> {
  if (points.length === 0) return {};
  const q = new URLSearchParams();
  points.forEach((p) => {
    q.append('lat', String(p.lat));
    q.append('lon', String(p.lon));
  });
  const res = await fetch(`${API_BASE}/api/v1/weather/points?${q}`, { signal });
  if (!res.ok) throw new Error(`Weather: HTTP ${res.status}`);
  const body = (await res.json()) as { points: Record<string, PointWeather | null> };
  return Object.fromEntries(Object.entries(body.points).filter((e): e is [string, PointWeather] => e[1] !== null));
}

export interface WeatherDetail extends PointWeather {
  sky: string;
  humidity_pct: number | null;
  wind_kmh: number | null;
  gust_kmh: number | null;
  next_hours: { time: string; mm: number; chance_pct: number | null }[];
  warnings: { title: string; valid_to: string }[];
  warnings_covered: boolean;
  warnings_source: string;
}

export async function fetchWeatherDetail(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherDetail> {
  const res = await fetch(`${API_BASE}/api/v1/weather/detail?lat=${lat}&lon=${lon}`, { signal });
  if (!res.ok) throw new Error(`Weather: HTTP ${res.status}`);
  return (await res.json()) as WeatherDetail;
}
