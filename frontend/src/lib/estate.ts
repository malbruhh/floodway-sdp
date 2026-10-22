// Pure logic behind the Estate page (docs/PLAN-ESTATE.md): what is inside one township, and a rule-based building risk.
import { DANGER_RADIUS_SCALE, FLOOD_PRONE } from '../data/klDemo';
import { radiusOf, stateOf, type Scenario } from './floodScenario';
import type { CitizenReport } from '../types';
import type { AlertEvent, Camera, Level } from '../types/vision';
import { overallLevel } from './home';
import { reportStatusInfo } from './reportStatus';
import { inTownship, type Township } from './townships';
import { haversineKm } from './vision/geo';
import { LEVELS, levelRank } from './vision/levels';

export const camerasIn = (t: Township, cameras: Camera[]): Camera[] => cameras.filter((c) => inTownship(t, c));
export const areaLevel = (cameras: Camera[]): Level | null => overallLevel(cameras);
export const alertsFor = (alerts: AlertEvent[], cameraIds: Set<string>): AlertEvent[] => alerts.filter((a) => cameraIds.has(a.camera_id));

export interface AreaReports {
  open: CitizenReport[];
  published: number;
}

/** Reports inside the township: those waiting for review (deepest first, unknown depth last) and a count of published ones. REJECTED is in neither. */
export function reportsFor(reports: CitizenReport[], t: Township): AreaReports {
  const here = reports.filter((r) => inTownship(t, r));
  const depth = (r: CitizenReport) => (Number.isFinite(r.waterDepthCm) ? r.waterDepthCm : -Infinity);
  return {
    open: here.filter((r) => reportStatusInfo(r.status).awaitingReview).sort((a, b) => depth(b) - depth(a)),
    published: here.filter((r) => reportStatusInfo(r.status).published).length,
  };
}

// ───────────── building input ─────────────
export interface BuildingInput {
  placeId: string;
  basementLevels: number;
  groundFloorCm: number;
  criticalEquipment: boolean;
}

export const DEFAULT_BUILDING: BuildingInput = { placeId: '', basementLevels: 0, groundFloorCm: 0, criticalEquipment: false };
const STORAGE_KEY = 'floodway_estate_building';

const clampInt = (v: unknown, max: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0);

export function sanitizeBuilding(raw: unknown): BuildingInput {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    placeId: typeof r.placeId === 'string' ? r.placeId : '',
    basementLevels: clampInt(r.basementLevels, 5),
    groundFloorCm: clampInt(r.groundFloorCm, 200),
    criticalEquipment: r.criticalEquipment === true,
  };
}

export function loadBuilding(): BuildingInput {
  try {
    return sanitizeBuilding(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_BUILDING };
  }
}

export function saveBuilding(b: BuildingInput): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
  } catch {
    /* storage blocked: the inputs just do not persist */
  }
}

// ───────────── building risk ─────────────
export const RISK_DISCLAIMER = 'Rule-based estimate from illustrative flood areas, not an engineering assessment. General guidance only.';

export const ACTIONS: Record<Level, string[]> = {
  NORMAL: ['No action needed. Keep drains and basement sumps clear.'],
  ADVISORY: ['Check that basement sump pumps and drains work.', 'Brief security staff to watch the river cameras.'],
  WARNING: ['Move vehicles and stock out of basement levels now.', 'Close flood barriers and tell tenants to prepare.', 'Check the evacuation route on the Map.'],
  DANGER: [
    'Clear all basement levels now and keep people out.',
    'Switch off basement power at the isolator only if it is safe to reach.',
    'Do not use basement lifts or stairs.',
    'Follow the evacuation route on the Map.',
  ],
};
export const EQUIPMENT_ACTION = 'Move or shut down critical basement equipment before water arrives.';

export interface BuildingRisk {
  level: Level;
  nearest: { name: string; distanceM: number; flooded: boolean } | null;
  reasons: string[];
  actions: string[];
}

/** Exposure 3 inside a flooded area, 2 within 300 m of one, 1 inside the danger-size reach of a dry one, else 0. */
export function buildingRisk(input: BuildingInput, origin: { lat: number; lon: number }, scenario: Scenario): BuildingRisk {
  let exposure = 0;
  let nearest: { name: string; distanceM: number; flooded: boolean; d: number } | null = null;
  for (const a of FLOOD_PRONE) {
    const d = haversineKm(origin.lat, origin.lon, a.lat, a.lon) * 1000;
    const flooded = stateOf(a, scenario) === 'flooded';
    const r = radiusOf(a, scenario);
    const e = flooded && d <= r ? 3 : flooded && d <= r + 300 ? 2 : d <= a.radiusM * DANGER_RADIUS_SCALE ? 1 : 0;
    exposure = Math.max(exposure, e);
    if (!nearest || d < nearest.d) nearest = { name: a.name, distanceM: Math.round(d), flooded, d };
  }

  let level: Level = LEVELS[exposure];
  const reasons: string[] = [];
  if (nearest) reasons.push(`Nearest flood-prone area: ${nearest.name}, ${nearest.distanceM} m away (${nearest.flooded ? 'flooded now' : 'dry now'}).`);
  if (input.basementLevels > 0 && levelRank(level) >= levelRank('ADVISORY')) {
    level = LEVELS[Math.min(levelRank(level) + 1, LEVELS.length - 1)];
    reasons.push('Basement levels sit below the road, so water reaches them first.');
  }
  // A user's claim about their own building must never lower a warning, so height only adds a note.
  if (input.groundFloorCm >= 50) reasons.push(`Raised ground floor helps only until water passes about ${input.groundFloorCm} cm.`);

  const actions = [...ACTIONS[level]];
  if (input.criticalEquipment && input.basementLevels > 0 && levelRank(level) >= levelRank('ADVISORY')) actions.push(EQUIPMENT_ACTION);
  return { level, nearest: nearest && { name: nearest.name, distanceM: nearest.distanceM, flooded: nearest.flooded }, reasons, actions };
}
