import { describe, expect, it } from 'vitest';
import shelters from '../data/kl_shelters.json';
import { TOWNSHIPS, townshipById, townshipContents } from '../lib/townships';

describe('townships', () => {
  it('each township holds at least one origin, flood area and shelter', () => {
    for (const t of TOWNSHIPS) {
      const c = townshipContents(t, shelters, []);
      expect(c.origins.length, t.id).toBeGreaterThan(0);
      expect(c.floodAreas.length, t.id).toBeGreaterThan(0);
      expect(c.shelters.length, t.id).toBeGreaterThan(0);
    }
  });
  it('the KL-wide entry contains every shelter; unknown id falls back to it', () => {
    expect(townshipContents(TOWNSHIPS[0], shelters, []).shelters).toHaveLength(shelters.length);
    expect(townshipById('nope').id).toBe(TOWNSHIPS[0].id);
  });
});
