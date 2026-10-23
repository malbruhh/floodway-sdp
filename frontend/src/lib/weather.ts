/** Standard rain-rate classes in mm per hour. */
export function rainClass(rate: number): 'none' | 'light' | 'moderate' | 'heavy' {
  if (rate < 0.1) return 'none';
  if (rate < 2.5) return 'light';
  if (rate < 7.6) return 'moderate';
  return 'heavy';
}

export const RAIN_LABEL = { none: 'No rain', light: 'Light rain', moderate: 'Moderate rain', heavy: 'Heavy rain' } as const;
