import townshipsJson from '../data/townships.json';
import { FLOOD_PRONE, ORIGINS } from '../data/klDemo';

/** [south, west, north, east] */
export interface Township {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  bbox: [number, number, number, number];
}

export const TOWNSHIPS = townshipsJson as Township[];
export const DEFAULT_TOWNSHIP_ID = 'kl-all';

type Point = { lat: number; lon: number };

export const inTownship = (t: Township, p: Point): boolean =>
  p.lat >= t.bbox[0] && p.lat <= t.bbox[2] && p.lon >= t.bbox[1] && p.lon <= t.bbox[3];

export const townshipById = (id: string): Township => TOWNSHIPS.find((t) => t.id === id) ?? TOWNSHIPS[0];

/** Everything the app knows inside one township. Membership is by bounding box, so there is one list per kind, not per township. */
export function townshipContents<S extends Point, C extends Point>(t: Township, shelters: S[], cameras: C[]) {
  return {
    origins: ORIGINS.filter((o) => inTownship(t, o)),
    floodAreas: FLOOD_PRONE.filter((a) => inTownship(t, a)),
    shelters: shelters.filter((s) => inTownship(t, s)),
    cameras: cameras.filter((c) => inTownship(t, c)),
  };
}
