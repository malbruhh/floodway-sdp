import { describe, expect, it } from 'vitest';
import { depthWords, validateReport } from '../lib/reportForm';

describe('report form', () => {
  it('needs a short description and a place', () => {
    expect(validateReport('', '')).toEqual({ title: expect.stringMatching(/what you see/), location: 'Tell us where this is.' });
    expect(validateReport('abc', 'KL').title).toBeDefined();
    expect(validateReport('Water over the road', 'Kampung Baru')).toEqual({});
  });
  it('words the depth', () => {
    expect(depthWords(5)).toBe('ankle deep or less');
    expect(depthWords(40)).toBe('about knee deep');
    expect(depthWords(120)).toBe('deeper than waist deep');
  });
});
