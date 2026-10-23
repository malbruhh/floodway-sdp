// Pure logic behind the Home screen, kept out of the components so it can be tested.
import type { Scenario } from './floodScenario';
import type { Camera, Level } from '../types/vision';
import { haversineKm, PLACES } from './vision/geo';
import type { Place } from './vision/geo';
import { levelRank } from './vision/levels';

/** The online camera with the highest level, ties broken by the higher water ratio. null when nothing is reporting. */
export function highestRisk(cameras: Camera[]): Camera | null {
  let best: Camera | null = null;
  for (const c of cameras) {
    if (!c.online || !c.reading) continue;
    if (!best || !best.reading) { best = c; continue; }
    const a = levelRank(c.reading.level);
    const b = levelRank(best.reading.level);
    if (a > b || (a === b && c.reading.water_ratio > best.reading.water_ratio)) best = c;
  }
  return best;
}

/** The overall level shown in the hero: the highest level among reporting cameras. */
export function overallLevel(cameras: Camera[]): Level | null {
  return highestRisk(cameras)?.reading?.level ?? null;
}

/** The map's flood scenario that matches the cameras' overall level. */
export function scenarioFromLevel(level: Level | null): Scenario {
  return level === 'DANGER' ? 'danger' : level === 'WARNING' ? 'warning' : 'normal';
}

/** Newest reading time across cameras (ms since epoch), or null. */
export function newestReadingAt(cameras: Camera[]): number | null {
  let newest: number | null = null;
  for (const c of cameras) {
    const t = c.reading ? Date.parse(c.reading.timestamp) : NaN;
    if (Number.isFinite(t) && (newest === null || t > newest)) newest = t;
  }
  return newest;
}

export type Freshness = 'fresh' | 'aging' | 'stale' | 'unknown';

/** fresh under 60 s, aging under 5 min, stale beyond; unknown when there is no reading at all. */
export function freshness(at: number | null, now = Date.now()): { state: Freshness; seconds: number | null } {
  if (at === null) return { state: 'unknown', seconds: null };
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  return { state: seconds < 60 ? 'fresh' : seconds < 300 ? 'aging' : 'stale', seconds };
}

export interface DistrictRow {
  district: string;
  level: Level;
  /** Highest water ratio among its cameras (1.0 = bank full). */
  ratio: number;
  cameras: number;
}

/**
 * Group cameras by the nearest named place. The backend has no district field, so this is a stated approximation:
 * the UI says "grouped by nearest place". Ranked by level, then by water ratio. Offline cameras are skipped.
 */
export function districtRisk(cameras: Camera[], places: Place[] = PLACES): DistrictRow[] {
  const rows = new Map<string, DistrictRow>();
  for (const c of cameras) {
    if (!c.online || !c.reading) continue;
    const nearest = places.reduce((best, p) => (haversineKm(p.lat, p.lon, c.lat, c.lon) < haversineKm(best.lat, best.lon, c.lat, c.lon) ? p : best), places[0]);
    const name = nearest.label.split(',')[0];
    const cur = rows.get(name);
    const level = c.reading.level;
    if (!cur) rows.set(name, { district: name, level, ratio: c.reading.water_ratio, cameras: 1 });
    else {
      cur.cameras += 1;
      cur.ratio = Math.max(cur.ratio, c.reading.water_ratio);
      if (levelRank(level) > levelRank(cur.level)) cur.level = level;
    }
  }
  return [...rows.values()].sort((a, b) => levelRank(b.level) - levelRank(a.level) || b.ratio - a.ratio);
}

export interface CameraCounts {
  total: number;
  online: number;
  alerting: number;
}

export function cameraCounts(cameras: Camera[]): CameraCounts {
  const online = cameras.filter((c) => c.online);
  return {
    total: cameras.length,
    online: online.length,
    alerting: online.filter((c) => c.reading && levelRank(c.reading.level) >= levelRank('WARNING')).length,
  };
}

/** Plain-words sentence for the hero, never stronger than the data. */
export function heroSentence(level: Level | null, source: 'live' | 'sample', camera: Camera | null): string {
  if (level === null || !camera) return 'No camera is reporting right now.';
  const where = camera.name;
  const base = level === 'DANGER' ? `Water is at the danger line at ${where}.` : level === 'WARNING' ? `Water is above the warning line at ${where}.` : level === 'ADVISORY' ? `Water is above normal at ${where}. Keep watching.` : 'Water is within its normal range at every reporting camera.';
  return source === 'sample' ? `${base} (Sample cameras: this is a demo.)` : base;
}

/** Nearest shelter that is open; if none is open, the nearest of all; undefined for an empty list. */
export function nearestOpenShelter<T extends { status: string; distanceKm: number }>(shelters: T[]): T | undefined {
  const byDistance = (a: T, b: T) => a.distanceKm - b.distanceKm;
  const open = shelters.filter((s) => s.status === 'OPEN').sort(byDistance);
  return open[0] ?? [...shelters].sort(byDistance)[0];
}

/** A seeded demo camera: a self-running scene, or the seeded offline placeholder (ids start with "sample-"). */
export const isSampleCamera = (c: Pick<Camera, 'id' | 'source_type'>): boolean => c.source_type === 'synthetic' || c.id.startsWith('sample-');

/** True when every camera is a sample, or there are none to say otherwise. */
export const allSampleCameras = (cameras: Pick<Camera, 'id' | 'source_type'>[]): boolean => cameras.every(isSampleCamera);

/** "Sg. Klang @ Masjid Jamek" -> "River camera at Masjid Jamek". Names without an "@" are used as given. */
export function plainCameraName(name: string): string {
  const at = name.split('@');
  return at.length > 1 ? `River camera at ${at[at.length - 1].trim()}` : name;
}

/** The place part only: "Masjid Jamek". */
export const cameraPlace = (name: string): string => plainCameraName(name).replace(/^River camera at /, '');

/** One calm sentence under the risk word. Never stronger than the reading. */
export function causeLine(level: Level | null, camera: Camera | null): string {
  if (level === null || !camera) return 'No camera is reporting right now, so we cannot tell. Follow official warnings.';
  const place = cameraPlace(camera.name);
  if (level === 'DANGER') return `The river at ${place} is at the danger line.`;
  if (level === 'WARNING') return `The river at ${place} is above the warning line.`;
  if (level === 'ADVISORY') return `The river at ${place} is higher than usual. Keep watching.`;
  return 'Every river camera we watch is in its normal range.';
}

/** "updated 40 s ago", "updated 3 min ago", or "no data yet". */
export function dataAge(at: number | null, now = Date.now()): string {
  if (at === null) return 'no data yet';
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `updated ${s} s ago`;
  if (s < 3600) return `updated ${Math.round(s / 60)} min ago`;
  return `updated ${Math.round(s / 3600)} h ago`;
}

export interface PrimaryAction { label: string; sub: string; kind: 'refuge' | 'area' }

/** Warning and danger lead with the way out; calm days lead with a look at the map. */
export function primaryAction(level: Level | null): PrimaryAction {
  if (level === 'WARNING' || level === 'DANGER') return { label: 'Go to refuge', sub: 'Nearest open centre and a route to it', kind: 'refuge' };
  return { label: 'Check my area', sub: 'See flooded roads and refuges on the map', kind: 'area' };
}

/** Plain steps for the "What to do" stop. General guidance, not an official advisory. */
export function whatToDo(level: Level | null): string[] {
  if (level === 'DANGER') return ['Leave now. Do not walk or drive through floodwater.', 'Take your phone, medicine and documents.', 'Tell your family where you are going.'];
  if (level === 'WARNING') return ['Get ready to leave: move valuables up and charge your phone.', 'Check the route to the refuge now, while roads are open.', 'Tell your family your plan.'];
  if (level === 'ADVISORY') return ['No action needed yet.', 'Keep this page open and check again in 30 minutes.'];
  return ['Nothing to do right now.', 'If you see flooding, report it so others know.'];
}
