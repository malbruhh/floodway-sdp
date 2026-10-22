import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ASSUMPTION_LABELS, ASSUMPTION_LIMITS, DEFAULT_ASSUMPTIONS, buildResilienceView, clampAssumption, estimateLossAvoided,
  formatLead, formulaText, loadAssumptions, sanitizeAssumptions, saveAssumptions,
  type Assumptions,
} from '../lib/resilience';
import { clientId, exportCsvUrl, fetchResilienceSummary, postRouteEvent } from '../services/resilience';
import { setWriteToken } from '../services/auth';
import type { Episode, ResilienceSummary } from '../types/resilience';

const A: Assumptions = { minLeadMin: 15, householdsPerZone: 200, responseRatePct: 30, movableValueRm: 3000 };
const ep = (lead: number | null): Episode => ({
  camera_id: 'c', camera_name: 'C', started_at: 't', early_signal_at: 't', warning_at: null, danger_at: null, ended_at: null,
  lead_time_s: lead, interrupted: false, simulated: true,
});
const summary = (over: Partial<ResilienceSummary> = {}): ResilienceSummary => ({
  window_h: 24, generated_at: 't', log_since: 't', all_simulated: true,
  episodes: [ep(1200), ep(null)], episodes_caught: 2, episodes_ongoing: 1,
  lead: { count: 1, none_count: 1, median_s: 1200, min_s: 1200, max_s: 1200 },
  alerts: { raised: 3, all_clear: 1, sent_external: 2, failed: 0, suppressed: 0 },
  routes: { started: 4, arrived: 3 }, ...over,
});

afterEach(() => { vi.unstubAllGlobals(); setWriteToken(''); });

describe('estimateLossAvoided', () => {
  it('multiplies qualifying episodes by the three assumptions (hand-computed)', () => {
    // 2 episodes × 200 households × 30% × RM 3,000 = RM 360,000
    expect(estimateLossAvoided([ep(1200), ep(900)], A)).toEqual({ qualifying: 2, total: 2, rm: 360_000 });
  });
  it('counts a lead time equal to the minimum and drops one second less', () => {
    expect(estimateLossAvoided([ep(900)], A).qualifying).toBe(1);
    expect(estimateLossAvoided([ep(899)], A).qualifying).toBe(0);
  });
  it('never counts an episode without a lead time', () => {
    expect(estimateLossAvoided([ep(null), ep(null)], { ...A, minLeadMin: 0 })).toEqual({ qualifying: 0, total: 2, rm: 0 });
  });
  it('is zero for no episodes and for any zero assumption', () => {
    expect(estimateLossAvoided([], A).rm).toBe(0);
    for (const k of ['householdsPerZone', 'responseRatePct', 'movableValueRm'] as const) {
      expect(estimateLossAvoided([ep(3600)], { ...A, [k]: 0 }).rm).toBe(0);
    }
  });
  it('rounds to whole ringgit', () => {
    expect(estimateLossAvoided([ep(3600)], { ...A, householdsPerZone: 1, responseRatePct: 33.3, movableValueRm: 1 }).rm).toBe(0);
    expect(estimateLossAvoided([ep(3600)], { ...A, householdsPerZone: 3, responseRatePct: 50, movableValueRm: 1 }).rm).toBe(2); // 1.5 rounds up
  });
  it('stays finite at the largest allowed inputs', () => {
    const max = sanitizeAssumptions({ minLeadMin: 0, householdsPerZone: 1e12, responseRatePct: 1e9, movableValueRm: 1e15 });
    expect(Number.isFinite(estimateLossAvoided([ep(10)], max).rm)).toBe(true);
    expect(max).toEqual({ minLeadMin: 0, householdsPerZone: 100_000, responseRatePct: 100, movableValueRm: 1_000_000 });
  });
});

describe('assumptions are sanitised', () => {
  it('clamps negatives and rejects NaN, Infinity and non-numbers', () => {
    expect(clampAssumption('responseRatePct', -5)).toBe(0);
    expect(clampAssumption('responseRatePct', 250)).toBe(100);
    for (const bad of [NaN, Infinity, -Infinity, '30', null, undefined, {}]) {
      expect(clampAssumption('responseRatePct', bad)).toBe(DEFAULT_ASSUMPTIONS.responseRatePct);
    }
  });
  it('falls back per field, not for the whole object', () => {
    expect(sanitizeAssumptions({ minLeadMin: 20, householdsPerZone: 'lots', extra: 1 })).toEqual({ ...DEFAULT_ASSUMPTIONS, minLeadMin: 20 });
  });
  it('returns defaults for non-objects', () => {
    for (const raw of [null, undefined, 42, 'x', [], true]) expect(sanitizeAssumptions(raw)).toEqual(DEFAULT_ASSUMPTIONS);
  });
  it('loads defaults from corrupt, empty or throwing storage', () => {
    expect(loadAssumptions({ getItem: () => '{not json' })).toEqual(DEFAULT_ASSUMPTIONS);
    expect(loadAssumptions({ getItem: () => null })).toEqual(DEFAULT_ASSUMPTIONS);
    expect(loadAssumptions({ getItem: () => { throw new Error('blocked'); } })).toEqual(DEFAULT_ASSUMPTIONS);
    expect(loadAssumptions(null)).toEqual(DEFAULT_ASSUMPTIONS);
  });
  it('round-trips through storage and survives a throwing setItem', () => {
    let saved = '';
    saveAssumptions({ ...A, minLeadMin: 30 }, { setItem: (_k, v) => { saved = v; } });
    expect(loadAssumptions({ getItem: () => saved }).minLeadMin).toBe(30);
    expect(() => saveAssumptions(A, { setItem: () => { throw new Error('quota'); } })).not.toThrow();
  });
  it('keeps every limit and label in step with the assumption keys', () => {
    expect(Object.keys(ASSUMPTION_LIMITS).sort()).toEqual(Object.keys(DEFAULT_ASSUMPTIONS).sort());
    expect(Object.keys(ASSUMPTION_LABELS).sort()).toEqual(Object.keys(DEFAULT_ASSUMPTIONS).sort());
  });
});

describe('formulaText states the method', () => {
  it('shows every assumption value and the result', () => {
    const r = estimateLossAvoided([ep(1200)], A);
    const text = formulaText(A, r);
    for (const v of ['1 episode', '15 min', '200 households', '30%', 'RM 3,000', 'RM 180,000']) expect(text).toContain(v);
  });
});

describe('formatLead', () => {
  it('formats seconds, minutes and hours; null and bad values are n/a', () => {
    expect(formatLead(0)).toBe('0 s');
    expect(formatLead(59)).toBe('59 s');
    expect(formatLead(60)).toBe('1 min');
    expect(formatLead(61)).toBe('1 min');
    expect(formatLead(3600)).toBe('1 h 0 min');
    expect(formatLead(3 * 3600 + 5 * 60)).toBe('3 h 5 min');
    for (const bad of [null, NaN, -1, Infinity]) expect(formatLead(bad as number | null)).toBe('n/a');
  });
});

describe('buildResilienceView', () => {
  it('a missing summary is an error with no numbers at all', () => {
    const v = buildResilienceView(null, A);
    expect(v).toEqual({ status: 'error' });
  });
  it('carries the simulated flag and the loss estimate', () => {
    const v = buildResilienceView(summary(), A);
    if (v.status !== 'ready') throw new Error('expected ready');
    expect(v.allSimulated).toBe(true);
    expect(v.loss).toEqual({ qualifying: 1, total: 2, rm: 180_000 });
    expect(v.medianLead).toBe('20 min');
    expect(v.householdsRouted).toBe(4);
    expect(v.alertNote).toBeNull();
    expect(v.leadNote).toContain('1 of 2');
  });
  it('flags a live feed when not all events are simulated', () => {
    const v = buildResilienceView(summary({ all_simulated: false }), A);
    expect(v.status === 'ready' && v.allSimulated).toBe(false);
  });
  it('explains zero external sends instead of implying delivery', () => {
    const v = buildResilienceView(summary({ alerts: { raised: 2, all_clear: 0, sent_external: 0, failed: 0, suppressed: 0 } }), A);
    expect(v.status === 'ready' && v.alertNote).toMatch(/app only/);
  });
  it('an empty window is flagged empty with zeros, not an error', () => {
    const v = buildResilienceView(summary({
      episodes: [], episodes_caught: 0, episodes_ongoing: 0, lead: { count: 0, none_count: 0, median_s: null, min_s: null, max_s: null },
      alerts: { raised: 0, all_clear: 0, sent_external: 0, failed: 0, suppressed: 0 }, routes: { started: 0, arrived: 0 },
    }), A);
    if (v.status !== 'ready') throw new Error('expected ready');
    expect(v.empty).toBe(true);
    expect(v.medianLead).toBe('n/a');
    expect(v.alertNote).toBeNull();
    expect(v.loss.rm).toBe(0);
  });
});

describe('services', () => {
  it('fetchResilienceSummary returns the body, or null on a refusal, bad status or network error', async () => {
    const body = summary();
    const ok = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
    vi.stubGlobal('fetch', ok);
    expect(await fetchResilienceSummary(168)).toEqual(body);
    expect(String(ok.mock.calls[0][0])).toContain('/api/v1/resilience/summary?window_h=168');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    expect(await fetchResilienceSummary(24)).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await fetchResilienceSummary(24)).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('bad json'); } }));
    expect(await fetchResilienceSummary(24)).toBeNull();
  });

  it('builds export URLs for each dataset and window', () => {
    expect(exportCsvUrl('alerts', 720)).toMatch(/\/api\/v1\/resilience\/export\.csv\?kind=alerts&window_h=720$/);
  });

  it('postRouteEvent sends the bearer token and only kind, shelter and a random client id', async () => {
    setWriteToken('s3cret');
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ recorded: true }) });
    vi.stubGlobal('fetch', f);
    expect(await postRouteEvent('start', 'shelter-1')).toBe(true);
    const [, init] = f.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer s3cret');
    const body = JSON.parse(init.body);
    expect(Object.keys(body).sort()).toEqual(['client_id', 'kind', 'shelter_id']);
    expect(body).toMatchObject({ kind: 'start', shelter_id: 'shelter-1' });
  });

  it('postRouteEvent is false for a duplicate, a refusal or a network error, and never throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ recorded: false, duplicate: true }) }));
    expect(await postRouteEvent('start', 's')).toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    expect(await postRouteEvent('arrived', 's')).toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(postRouteEvent('arrived', 's')).resolves.toBe(false);
  });

  it('clientId is stable within a session, and still works when storage is blocked', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
    const first = clientId();
    expect(first.length).toBeGreaterThan(8);
    expect(clientId()).toBe(first);
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(clientId()).toMatch(/^anon-/);
  });
});
