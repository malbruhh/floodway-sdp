import { describe, expect, it } from 'vitest';
import { REF_OBJECTS, estimateDepth, passability } from '../lib/photoDepth';

const car = REF_OBJECTS.find((o) => o.id === 'car')!;

describe('estimateDepth', () => {
  it('waterline at the lower mark gives the lower-mark height', () => {
    const r = estimateDepth(car, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })!;
    expect(r.minCm).toBe(10);
    expect(r.maxCm).toBe(15);
  });

  it('waterline lower in the photo gives a shallower depth', () => {
    const high = estimateDepth(car, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.55 })!;
    const low = estimateDepth(car, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.8 })!;
    expect(low.maxCm).toBeLessThanOrEqual(high.maxCm);
    expect(low.minCm).toBe(0);
  });

  it('rejects marks out of order, or a waterline above the lower mark', () => {
    expect(estimateDepth(car, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.6 })).toBeNull();
    expect(estimateDepth(car, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.4 })).toBeNull();
  });

  it('keeps min <= mid <= max', () => {
    const r = estimateDepth(car, { x: 0.5, y: 0.1 }, { x: 0.5, y: 0.4 }, { x: 0.5, y: 0.45 })!;
    expect(r.minCm).toBeLessThanOrEqual(r.midCm);
    expect(r.midCm).toBeLessThanOrEqual(r.maxCm);
  });
});

describe('passability', () => {
  it('steps from ok to stop with depth', () => {
    expect(passability(10).tone).toBe('ok');
    expect(passability(20).tone).toBe('care');
    expect(passability(40).drive).toMatch(/high vehicles/);
    expect(passability(60)).toMatchObject({ tone: 'stop', drive: 'Do not drive through.' });
  });
});
