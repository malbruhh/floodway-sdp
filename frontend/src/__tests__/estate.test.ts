import { afterEach, describe, expect, it, vi } from 'vitest';
import { FLOOD_PRONE, ORIGINS } from '../data/klDemo';
import {
  ACTIONS, DEFAULT_BUILDING, EQUIPMENT_ACTION, alertsFor, areaLevel, buildingRisk, camerasIn, episodesFor, loadBuilding,
  medianLeadS, reportsFor, sanitizeBuilding, saveBuilding, type BuildingInput,
} from '../lib/estate';
import { townshipById, TOWNSHIPS, townshipContents } from '../lib/townships';
import { levelRank } from '../lib/vision/levels';
import type { CitizenReport } from '../types';
import type { Episode } from '../types/resilience';
import type { AlertEvent, Camera, Level } from '../types/vision';

const cam = (id: string, lat: number, lon: number, level: Level | null, online = true) =>
  ({ id, name: id, lat, lon, online, source_type: 'synthetic', reading: level && { level, water_ratio: 0.5, timestamp: 't' } }) as unknown as Camera;
const rep = (id: string, lat: number, lon: number, status: CitizenReport['status'], depth: number) =>
  ({ id, title: id, location: 'x', lat, lon, waterDepthCm: depth, status }) as CitizenReport;
const epi = (camera_id: string, lead: number | null) => ({ camera_id, lead_time_s: lead }) as Episode;
const alert = (camera_id: string) => ({ id: camera_id, camera_id }) as AlertEvent;
const B = (over: Partial<BuildingInput> = {}): BuildingInput => ({ ...DEFAULT_BUILDING, ...over });
const origin = (id: string) => ORIGINS.find((o) => o.id === id)!;
const FAR = { lat: 3.05, lon: 101.6 };

afterEach(() => vi.unstubAllGlobals());

describe('area helpers', () => {
  it('camerasIn keeps cameras inside the box, edge included', () => {
    const t = townshipById('kampung-baru');
    const got = camerasIn(t, [cam('in', 3.165, 101.705, null), cam('out', 3.05, 101.6, null), cam('edge', 3.155, 101.685, null)]);
    expect(got.map((c) => c.id)).toEqual(['in', 'edge']);
  });
  it('areaLevel is the highest online level, null when nothing reports', () => {
    expect(areaLevel([cam('a', 0, 0, 'ADVISORY'), cam('b', 0, 0, 'DANGER'), cam('c', 0, 0, 'WARNING')])).toBe('DANGER');
    expect(areaLevel([cam('a', 0, 0, 'ADVISORY'), cam('b', 0, 0, 'DANGER', false)])).toBe('ADVISORY');
    expect(areaLevel([])).toBeNull();
    expect(areaLevel([cam('a', 0, 0, null)])).toBeNull();
  });
  it('alertsFor and episodesFor filter by camera id and keep order', () => {
    const ids = new Set(['b', 'a']);
    expect(alertsFor([alert('a'), alert('z'), alert('b')], ids).map((x) => x.id)).toEqual(['a', 'b']);
    expect(episodesFor([epi('z', 1), epi('b', 2), epi('a', 3)], ids).map((x) => x.camera_id)).toEqual(['b', 'a']);
    expect(alertsFor([alert('a')], new Set())).toEqual([]);
    expect(episodesFor([epi('a', 1)], new Set())).toEqual([]);
  });
  it('medianLeadS', () => {
    expect(medianLeadS([])).toBeNull();
    expect(medianLeadS([epi('a', null)])).toBeNull();
    expect(medianLeadS([epi('a', 600)])).toBe(600);
    expect(medianLeadS([epi('a', 600), epi('b', 1200)])).toBe(900);
    expect(medianLeadS([epi('a', 1200), epi('b', null), epi('c', 600), epi('d', 300)])).toBe(600);
    expect(medianLeadS([epi('a', 1), epi('b', 2)])).toBe(2);
  });
});

describe('reportsFor', () => {
  const t = townshipById('kampung-baru');
  it('splits open and published, drops rejected and outside, sorts deepest first with unknown last', () => {
    const r = reportsFor(
      [
        rep('shallow', 3.165, 101.705, 'UNDER_REVIEW', 10),
        rep('unknown', 3.165, 101.705, 'AI_VERIFIED', Number.NaN),
        rep('deep', 3.165, 101.705, 'UNDER_REVIEW', 60),
        rep('seed', 3.165, 101.705, 'VERIFIED', 35),
        rep('desk', 3.165, 101.705, 'OFFICIAL_VERIFIED', 20),
        rep('no', 3.165, 101.705, 'REJECTED', 99),
        rep('away', 3.03, 101.53, 'UNDER_REVIEW', 99),
      ],
      t,
    );
    expect(r.open.map((x) => x.id)).toEqual(['deep', 'shallow', 'unknown']);
    expect(r.published).toBe(2);
  });
  it('empty input gives empty output', () => expect(reportsFor([], t)).toEqual({ open: [], published: 0 }));
});

describe('sanitizeBuilding and storage', () => {
  it('turns junk into safe values', () => {
    expect(sanitizeBuilding(null)).toEqual(DEFAULT_BUILDING);
    expect(sanitizeBuilding('x')).toEqual(DEFAULT_BUILDING);
    expect(sanitizeBuilding({ basementLevels: 99 }).basementLevels).toBe(5);
    expect(sanitizeBuilding({ basementLevels: -3 }).basementLevels).toBe(0);
    expect(sanitizeBuilding({ basementLevels: Number.NaN }).basementLevels).toBe(0);
    expect(sanitizeBuilding({ basementLevels: Infinity }).basementLevels).toBe(0);
    expect(sanitizeBuilding({ basementLevels: '3' }).basementLevels).toBe(0);
    expect(sanitizeBuilding({ basementLevels: 2.6 }).basementLevels).toBe(3);
    expect(sanitizeBuilding({ groundFloorCm: 500 }).groundFloorCm).toBe(200);
    expect(sanitizeBuilding({ criticalEquipment: 'true' }).criticalEquipment).toBe(false);
    expect(sanitizeBuilding({ criticalEquipment: true }).criticalEquipment).toBe(true);
    expect(sanitizeBuilding({ placeId: 5 }).placeId).toBe('');
    expect(sanitizeBuilding({ placeId: 'sentul' }).placeId).toBe('sentul');
  });
  it('round-trips through localStorage', () => {
    const mem: Record<string, string> = {};
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; } });
    expect(loadBuilding()).toEqual(DEFAULT_BUILDING);
    const b = B({ placeId: 'sentul', basementLevels: 2, groundFloorCm: 60, criticalEquipment: true });
    saveBuilding(b);
    expect(loadBuilding()).toEqual(b);
  });
  it('survives corrupt data and a blocked store', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{not json', setItem: () => { throw new Error('blocked'); } });
    expect(loadBuilding()).toEqual(DEFAULT_BUILDING);
    expect(() => saveBuilding(B())).not.toThrow();
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => {} });
    expect(loadBuilding()).toEqual(DEFAULT_BUILDING);
  });
});

describe('buildingRisk', () => {
  const jamek = origin('masjid-jamek');
  it('an origin on the confluence is ADVISORY on a dry day and DANGER once it floods', () => {
    const dry = buildingRisk(B(), jamek, 'normal');
    expect(dry.level).toBe('ADVISORY');
    expect(dry.nearest).toMatchObject({ name: 'Klang / Gombak confluence', flooded: false });
    const wet = buildingRisk(B(), jamek, 'warning');
    expect(wet.level).toBe('DANGER');
    expect(wet.nearest?.flooded).toBe(true);
    expect(wet.reasons[0]).toContain('flooded now');
    expect(dry.reasons[0]).toContain('dry now');
  });
  it('a basement raises the level one step and says why', () => {
    const r = buildingRisk(B({ basementLevels: 2 }), jamek, 'normal');
    expect(r.level).toBe('WARNING');
    expect(r.reasons.some((x) => x.includes('Basement levels'))).toBe(true);
  });
  it('is capped at DANGER', () => expect(buildingRisk(B({ basementLevels: 2 }), jamek, 'danger').level).toBe('DANGER'));
  it('a point far from every area stays NORMAL, basement or not', () => {
    for (const s of ['normal', 'warning', 'danger'] as const) {
      expect(buildingRisk(B({ basementLevels: 3 }), FAR, s).level).toBe('NORMAL');
    }
  });
  it('ground floor height never lowers the level and only adds a note from 50 cm', () => {
    const base = buildingRisk(B(), jamek, 'warning');
    const high = buildingRisk(B({ groundFloorCm: 150 }), jamek, 'warning');
    expect(high.level).toBe(base.level);
    expect(high.reasons).toHaveLength(base.reasons.length + 1);
    expect(high.reasons.at(-1)).toContain('150 cm');
    expect(buildingRisk(B({ groundFloorCm: 49 }), jamek, 'warning').reasons).toHaveLength(base.reasons.length);
  });
  it('actions match the level text; equipment line only with a basement at ADVISORY or above', () => {
    expect(buildingRisk(B(), FAR, 'normal').actions).toEqual(ACTIONS.NORMAL);
    expect(buildingRisk(B(), jamek, 'normal').actions[0]).toBe(ACTIONS.ADVISORY[0]);
    expect(buildingRisk(B({ basementLevels: 2 }), jamek, 'normal').actions[0]).toBe(ACTIONS.WARNING[0]);
    expect(buildingRisk(B(), jamek, 'warning').actions[0]).toBe(ACTIONS.DANGER[0]);
    expect(buildingRisk(B({ criticalEquipment: true, basementLevels: 1 }), jamek, 'warning').actions.at(-1)).toBe(EQUIPMENT_ACTION);
    expect(buildingRisk(B({ criticalEquipment: true, basementLevels: 0 }), jamek, 'warning').actions).not.toContain(EQUIPMENT_ACTION);
    expect(buildingRisk(B({ criticalEquipment: true, basementLevels: 3 }), FAR, 'danger').actions).not.toContain(EQUIPMENT_ACTION);
  });
  it('returns copies of the action lists', () => {
    buildingRisk(B(), jamek, 'warning').actions.push('junk');
    expect(buildingRisk(B(), jamek, 'warning').actions).toEqual(ACTIONS.DANGER);
  });
  it('never gets safer as the scenario worsens, for every demo place', () => {
    for (const o of ORIGINS) {
      for (const basementLevels of [0, 2]) {
        const ranks = (['normal', 'warning', 'danger'] as const).map((s) => levelRank(buildingRisk(B({ basementLevels }), o, s).level));
        expect(ranks, o.id).toEqual([...ranks].sort((a, b) => a - b));
      }
    }
  });
  it('names a nearest area for every demo place', () => {
    expect(FLOOD_PRONE.length).toBeGreaterThan(0);
    for (const o of ORIGINS) expect(buildingRisk(B(), o, 'normal').nearest, o.id).not.toBeNull();
  });
});

describe('township data the page relies on', () => {
  it('every township offers at least one named place', () => {
    for (const t of TOWNSHIPS) expect(townshipContents(t, [], []).origins.length, t.id).toBeGreaterThan(0);
  });
});
