import { describe, expect, it } from 'vitest';
import { causeLine, cameraPlace, dataAge, plainCameraName, primaryAction, whatToDo } from '../lib/home';
import type { Camera } from '../types/vision';

const cam = { name: 'Sg. Klang @ Masjid Jamek' } as Camera;

describe('home copy', () => {
  it('turns a technical camera name into plain words', () => {
    expect(plainCameraName('Sg. Klang @ Masjid Jamek')).toBe('River camera at Masjid Jamek');
    expect(cameraPlace('Sg. Klang @ Masjid Jamek')).toBe('Masjid Jamek');
    expect(plainCameraName('Pasar Seni')).toBe('Pasar Seni');
  });
  it('states the cause per level and never overstates', () => {
    expect(causeLine('WARNING', cam)).toBe('The river at Masjid Jamek is above the warning line.');
    expect(causeLine('DANGER', cam)).toContain('danger line');
    expect(causeLine('NORMAL', cam)).toMatch(/normal range/);
    expect(causeLine(null, null)).toMatch(/cannot tell/);
  });
  it('formats data age', () => {
    expect(dataAge(null)).toBe('no data yet');
    expect(dataAge(1000, 41000)).toBe('updated 40 s ago');
    expect(dataAge(0, 180000)).toBe('updated 3 min ago');
  });
  it('leads with refuge only on warning and danger', () => {
    expect(primaryAction('DANGER').kind).toBe('refuge');
    expect(primaryAction('WARNING').kind).toBe('refuge');
    expect(primaryAction('ADVISORY').kind).toBe('area');
    expect(primaryAction(null).label).toBe('Check my area');
  });
  it('gives steps for every level', () => {
    for (const l of ['NORMAL', 'ADVISORY', 'WARNING', 'DANGER', null] as const) expect(whatToDo(l).length).toBeGreaterThan(0);
  });
});
