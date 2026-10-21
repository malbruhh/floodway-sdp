import { describe, expect, it } from 'vitest';
import { cameraCounts, districtRisk, freshness, heroSentence, highestRisk, newestReadingAt, overallLevel, scenarioFromLevel } from '../lib/home';
import type { Camera, Level, Reading } from '../types/vision';

const CAL = { roi: [[0.2, 0.3], [0.8, 0.3], [0.8, 0.9], [0.2, 0.9]] as [number, number][], lines: { normal: 0.78, warning: 0.6, danger: 0.35 } };
const reading = (id: string, level: Level, ratio: number, ts = '2026-10-14T01:00:00+08:00'): Reading => ({
  camera_id: id, timestamp: ts, window_seconds: 2, frames_analyzed: 5, water_ratio: ratio, waterline_y: 0.5, level, observed_level: level,
  confidence: 0.9, low_confidence: false, lines_crossed: [], trend: 'steady', model: 't', latency_ms: 1, action: 'none',
});
const cam = (id: string, level: Level | null, ratio = 0.3, over: Partial<Camera> = {}): Camera => ({
  id, name: id, provider: 'city', lat: 3.15, lon: 101.7, source_type: 'synthetic', is_playback: true, online: true, interval_s: 8,
  feed_refresh_s: 0, last_frame_at: null, calibration: CAL, reading: level ? reading(id, level, ratio) : null, ...over,
});

describe('highestRisk / overallLevel', () => {
  it('picks the highest level, then the higher ratio', () => {
    const cams = [cam('a', 'ADVISORY', 0.4), cam('b', 'WARNING', 0.62), cam('c', 'WARNING', 0.7), cam('d', 'NORMAL', 0.1)];
    expect(highestRisk(cams)?.id).toBe('c');
    expect(overallLevel(cams)).toBe('WARNING');
  });
  it('ignores offline cameras and cameras without a reading', () => {
    const cams = [cam('off', 'DANGER', 1, { online: false }), cam('none', null), cam('ok', 'NORMAL', 0.1)];
    expect(highestRisk(cams)?.id).toBe('ok');
  });
  it('is null when nothing reports', () => {
    expect(highestRisk([])).toBeNull();
    expect(overallLevel([cam('x', null)])).toBeNull();
  });
});

describe('freshness', () => {
  const now = Date.parse('2026-10-14T01:10:00+08:00');
  it('classifies by age', () => {
    expect(freshness(now - 20_000, now).state).toBe('fresh');
    expect(freshness(now - 120_000, now).state).toBe('aging');
    expect(freshness(now - 900_000, now).state).toBe('stale');
    expect(freshness(null, now)).toEqual({ state: 'unknown', seconds: null });
  });
  it('never reports a negative age (clock skew)', () => expect(freshness(now + 5_000, now).seconds).toBe(0));
  it('finds the newest reading', () => {
    const a = cam('a', 'NORMAL'); a.reading!.timestamp = '2026-10-14T01:00:00+08:00';
    const b = cam('b', 'NORMAL'); b.reading!.timestamp = '2026-10-14T01:05:00+08:00';
    expect(newestReadingAt([a, b])).toBe(Date.parse('2026-10-14T01:05:00+08:00'));
    expect(newestReadingAt([cam('x', null)])).toBeNull();
  });
});

describe('districtRisk', () => {
  it('groups by nearest named place and ranks by level then ratio', () => {
    const cams = [
      cam('jamek1', 'WARNING', 0.7, { lat: 3.149, lon: 101.696 }),
      cam('jamek2', 'NORMAL', 0.1, { lat: 3.1495, lon: 101.6965 }),
      cam('sentul', 'ADVISORY', 0.4, { lat: 3.184, lon: 101.693 }),
    ];
    const rows = districtRisk(cams);
    expect(rows.map((r) => r.district)).toEqual(['Masjid Jamek', 'Sentul']);
    expect(rows[0]).toMatchObject({ level: 'WARNING', cameras: 2, ratio: 0.7 });
  });
  it('skips offline cameras', () => expect(districtRisk([cam('o', 'DANGER', 1, { online: false })])).toEqual([]));
});

describe('cameraCounts and heroSentence', () => {
  it('counts online and alerting cameras', () => {
    expect(cameraCounts([cam('a', 'WARNING'), cam('b', 'NORMAL'), cam('c', 'DANGER', 1, { online: false })])).toEqual({ total: 3, online: 2, alerting: 1 });
  });
  it('says no data instead of inventing a level', () => expect(heroSentence(null, 'live', null)).toMatch(/No camera/));
  it('flags sample data in the sentence', () => {
    const c = cam('Sg. Klang', 'DANGER', 1);
    expect(heroSentence('DANGER', 'sample', c)).toMatch(/Sample cameras/);
    expect(heroSentence('DANGER', 'live', c)).not.toMatch(/Sample/);
  });
});

describe('nearestOpenShelter', async () => {
  const { nearestOpenShelter } = await import('../lib/home');
  const s = (id: string, status: string, distanceKm: number) => ({ id, status, distanceKm });
  it('prefers the nearest OPEN shelter over a nearer closed one', () => {
    expect(nearestOpenShelter([s('closed', 'CLOSED', 0.2), s('far', 'OPEN', 9), s('near', 'OPEN', 2)])?.id).toBe('near');
  });
  it('falls back to the nearest of all when none is open', () => {
    expect(nearestOpenShelter([s('a', 'FULL', 5), s('b', 'CLOSED', 1)])?.id).toBe('b');
  });
  it('does not mutate its input and handles an empty list', () => {
    const list = [s('a', 'OPEN', 3), s('b', 'OPEN', 1)];
    nearestOpenShelter(list);
    expect(list.map((x) => x.id)).toEqual(['a', 'b']);
    expect(nearestOpenShelter([])).toBeUndefined();
  });
});

describe('scenarioFromLevel', () => {
  it('maps camera levels to the map scenario', () => {
    expect(scenarioFromLevel('DANGER')).toBe('danger');
    expect(scenarioFromLevel('WARNING')).toBe('warning');
    expect(scenarioFromLevel('ADVISORY')).toBe('normal');
    expect(scenarioFromLevel('NORMAL')).toBe('normal');
    expect(scenarioFromLevel(null)).toBe('normal');
  });
});
