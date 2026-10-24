// Depth from a photo: two marks on a known object above the water give a scale,
// the waterline gives the drop below the lower mark. Ranges because object sizes vary.

export type RefObjectId = 'car' | 'motorbike' | 'person' | 'door';

export interface RefObject {
  id: RefObjectId;
  label: string;
  hint: string;
  upperMark: string;
  lowerMark: string;
  /** Real distance between the two marks, cm. */
  spanCm: [number, number];
  /** Height of the lower mark above the ground, cm. */
  lowerHeightCm: [number, number];
}

export const REF_OBJECTS: RefObject[] = [
  { id: 'car', label: 'Car', hint: 'A saloon or hatchback. SUVs sit higher.', upperMark: 'Top of the tyre', lowerMark: 'Bottom of the wheel rim', spanCm: [44, 52], lowerHeightCm: [11, 16] },
  { id: 'motorbike', label: 'Motorbike', hint: 'A typical kapchai or scooter, upright.', upperMark: 'Top of the tyre', lowerMark: 'Centre of the wheel hub', spanCm: [24, 30], lowerHeightCm: [24, 30] },
  { id: 'person', label: 'Person', hint: 'An adult standing in the water, not wading through a current.', upperMark: 'Top of the head', lowerMark: 'Belt line', spanCm: [70, 90], lowerHeightCm: [90, 110] },
  { id: 'door', label: 'Door', hint: 'House or shop door.', upperMark: 'Top of the door frame', lowerMark: 'Door handle', spanCm: [100, 120], lowerHeightCm: [90, 105] },
];

export interface Pt { x: number; y: number }

export interface DepthRange { minCm: number; maxCm: number; midCm: number }

const round5 = (n: number) => Math.round(n / 5) * 5;

/** Points are image fractions (0..1). Returns null if the marks are not in order or too close. */
export function estimateDepth(obj: RefObject, upper: Pt, lower: Pt, water: Pt, aspect = 1): DepthRange | null {
  // aspect = image height / width, so vertical fractions compare in the same units as x if needed.
  const spanPx = (lower.y - upper.y) * aspect;
  const dropPx = (water.y - lower.y) * aspect;
  if (spanPx < 0.02 * aspect || dropPx < 0) return null;
  const perPxMin = obj.spanCm[0] / spanPx;
  const perPxMax = obj.spanCm[1] / spanPx;
  const min = Math.max(0, obj.lowerHeightCm[0] - dropPx * perPxMax);
  const max = Math.max(0, obj.lowerHeightCm[1] - dropPx * perPxMin);
  const minCm = round5(min);
  const maxCm = Math.max(minCm, round5(max));
  return { minCm, maxCm, midCm: round5((min + max) / 2) };
}

export interface Passability {
  tone: 'ok' | 'care' | 'stop';
  drive: string;
  walk: string;
}

/** Uses the deeper end of the estimate. Plain guidance, not an official advisory. */
export function passability(depthCm: number): Passability {
  if (depthCm < 15) return { tone: 'ok', drive: 'Below the kerb top. Passable with care.', walk: 'Walkable. Watch for open drains under the water.' };
  if (depthCm < 30) return { tone: 'care', drive: 'Over the kerb. Passable with care, slowly.', walk: 'Wade only if you must; hidden drains and currents.' };
  if (depthCm < 50) return { tone: 'care', drive: 'Only high vehicles, slowly.', walk: 'Do not wade. Water at knee height can knock you down.' };
  return { tone: 'stop', drive: 'Do not drive through.', walk: 'Do not wade. Find another route.' };
}
