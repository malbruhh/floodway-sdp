import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitReport } from '../services/api';
import type { CitizenReport } from '../types';

const report: CitizenReport = {
  id: 'rep-1', title: 'Drain', location: 'Shah Alam', lat: 3.1, lon: 101.5, waterDepthCm: 30, status: 'AI_VERIFIED',
  verifiedBy: 'x', timestampStr: 'Just now', author: 'me', upvotes: 1,
};

afterEach(() => vi.unstubAllGlobals());

describe('submitReport', () => {
  it('returns the saved report and sends only a client-claimable status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ report: { id: 'rep-9', title: 'Drain', status: 'AI_VERIFIED', water_depth_cm: 30 } }) });
    vi.stubGlobal('fetch', fetchMock);
    const saved = await submitReport(report);
    expect(saved?.id).toBe('rep-9');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).status).toBe('AI_VERIFIED');
  });

  it('returns null when the server refuses or is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await submitReport(report)).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await submitReport(report)).toBeNull();
  });
});
