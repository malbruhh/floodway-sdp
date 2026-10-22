import type { CsvKind, ResilienceSummary } from '../types/resilience';
import { authHeaders } from './auth';
import { API_BASE } from './vision/config';

const BASE = `${API_BASE}/api/v1/resilience`;

/** Null on any failure: the page then shows an error state and no numbers (same rule as fetchForecast). */
export async function fetchResilienceSummary(windowH: number, signal?: AbortSignal): Promise<ResilienceSummary | null> {
  try {
    const timeout = AbortSignal.timeout(5000);
    const res = await fetch(`${BASE}/summary?window_h=${windowH}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    return res.ok ? ((await res.json()) as ResilienceSummary) : null;
  } catch {
    return null;
  }
}

export const exportCsvUrl = (kind: CsvKind, windowH: number): string => `${BASE}/export.csv?kind=${kind}&window_h=${windowH}`;

/** A random id for this browser tab, so the server can tell one household's repeated taps from two households. */
export function clientId(): string {
  try {
    const stored = sessionStorage.getItem('floodway_client_id');
    if (stored) return stored;
    const id = crypto.randomUUID();
    sessionStorage.setItem('floodway_client_id', id);
    return id;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Fire and forget: logging a drive must never get in the way of the drive. Resolves true when the server recorded it. */
export async function postRouteEvent(kind: 'start' | 'arrived', shelterId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/route-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ kind, shelter_id: shelterId, client_id: clientId() }),
      signal: AbortSignal.timeout(4000),
    });
    return res.ok && ((await res.json()) as { recorded?: boolean }).recorded === true;
  } catch {
    return false;
  }
}
