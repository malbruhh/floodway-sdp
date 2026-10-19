import { describe, expect, it } from 'vitest';
import { JPS_LABEL, JPS_STATUS, ageText } from '../lib/jps';
import { jpsImageUrl } from '../services/jps';

describe('JPS camera helpers', () => {
  it('words the age of a snapshot', () => {
    expect(ageText(30)).toBe('just now');
    expect(ageText(300)).toBe('5 min ago');
    expect(ageText(7200)).toBe('2 h ago');
    expect(ageText(172800)).toBe('2 d ago');
    expect(ageText(null)).toBe('unknown');
    expect(ageText(NaN)).toBe('unknown');
  });

  it('never claims an AI reading for JPS photos', () => {
    expect(JPS_LABEL).toMatch(/no AI water reading/i);
    expect(Object.keys(JPS_STATUS).sort()).toEqual(['offline', 'online', 'stale']);
  });

  it('proxies the image through our backend and busts the cache on a new update', () => {
    const url = jpsImageUrl({ image_path: '/api/v1/jps/cameras/25/image', last_update: '2026-10-19T23:26:40' });
    expect(url).toContain('/api/v1/jps/cameras/25/image?v=2026-10-19T23%3A26%3A40');
    expect(url).not.toContain('infobanjirjps');
  });
});
