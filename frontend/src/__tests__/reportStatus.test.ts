import { describe, expect, it } from 'vitest';
import { countReports, reportStatusInfo } from '../lib/reportStatus';
import { mapReport } from '../lib/mappers';
import type { CitizenReport } from '../types';

const mk = (id: string, status: CitizenReport['status'], extra: Partial<CitizenReport> = {}): CitizenReport => ({
  ...mapReport({ id, title: id, location: 'x', lat: 1, lon: 1, water_depth_cm: 30 }),
  status,
  ...extra,
});

describe('report status model', () => {
  it('every status has a pill, and published and awaiting-review never overlap', () => {
    for (const s of ['OFFICIAL_VERIFIED', 'AI_VERIFIED', 'VERIFIED', 'UNDER_REVIEW', 'REJECTED'] as const) {
      const i = reportStatusInfo(s);
      expect(i.pill.length).toBeGreaterThan(0);
      expect(i.published && i.awaitingReview).toBe(false);
    }
  });

  it('a backend VERIFIED report is demo data and published, not pending (the old card vs stat contradiction)', () => {
    const i = reportStatusInfo('VERIFIED');
    expect(i.pill).toBe('DEMO DATA');
    expect(i.published).toBe(true);
    expect(i.awaitingReview).toBe(false);
  });

  it('wording never claims an agency verified anything', () => {
    for (const s of ['OFFICIAL_VERIFIED', 'AI_VERIFIED', 'VERIFIED', 'UNDER_REVIEW'] as const) {
      const text = Object.values(reportStatusInfo(s)).join(' ');
      expect(text).not.toMatch(/NADMA|JPS|gazett/i);
      expect(text).not.toMatch(/\bofficial\b/i);
    }
  });

  it('counts agree with the card pills', () => {
    const reports = [mk('a', 'VERIFIED'), mk('b', 'VERIFIED'), mk('c', 'UNDER_REVIEW'), mk('d', 'AI_VERIFIED'), mk('e', 'REJECTED'), mk('f', 'OFFICIAL_VERIFIED')];
    const c = countReports(reports);
    expect(c.total).toBe(5); // rejected reports are not counted
    expect(c.published).toBe(3);
    expect(c.awaitingReview).toBe(2);
    expect(c.published + c.awaitingReview).toBe(c.total);
  });

  it('counts an AI assessment only when the check really ran', () => {
    const base = { verified: false, detectedHazards: [], estimatedDepthCm: 10, notes: '' };
    const ran = mk('r', 'UNDER_REVIEW', { aiVerification: { ...base, ran: true, confidenceScore: 0.4, engine: 'model' } });
    const notRun = mk('n', 'UNDER_REVIEW', { aiVerification: { ...base, ran: false, confidenceScore: 0, engine: 'AI check not run' } });
    expect(countReports([ran, notRun]).aiAssessed).toBe(1);
  });
});
