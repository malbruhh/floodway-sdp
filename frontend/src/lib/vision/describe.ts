import type { Camera, Reading } from '../../types/vision';
import { pct } from './format';

/** One plain-language sentence for the analysis panel. */
export function describeReading(reading: Reading): string {
  const where = `${pct(reading.water_ratio)} up the bank`;
  const crossed = reading.lines_crossed;
  const trend = reading.trend === 'rising' ? ' and rising' : reading.trend === 'falling' ? ' and falling' : '';
  if (reading.level === 'DANGER') return `Water is at the danger line (${where})${trend}. Move away from the water.`;
  if (reading.level === 'WARNING') return `Water has passed the amber warning line (${where})${trend}.`;
  if (reading.level === 'ADVISORY') return `Water is above its normal level (${where})${trend}. Keep watching.`;
  return crossed.length === 0 ? `Water is within its normal range (${where}).` : `Water is steady (${where}).`;
}

export function sourceLabel(camera: Camera): string {
  if (camera.source_type === 'synthetic') return 'Sample';
  if (camera.provider === 'mine') return 'My camera';
  if (camera.provider === 'city') return 'City camera';
  return 'Public feed';
}
