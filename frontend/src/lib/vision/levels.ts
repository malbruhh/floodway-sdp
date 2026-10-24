import { AlertTriangle, CheckCircle2, Info, Siren } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Level } from '../../types/vision';

export const LEVELS: Level[] = ['NORMAL', 'ADVISORY', 'WARNING', 'DANGER'];
export const levelRank = (level: Level): number => LEVELS.indexOf(level);
export const isAlertLevel = (level: Level): boolean => levelRank(level) >= levelRank('WARNING');

/**
 * The risk colour scale, used identically on Home, Map, Live Vision and Reports. Contrast is verified by
 * src/__tests__/palette.test.ts (WCAG): text on tint >= 4.5:1, white text on solid >= 4.5:1, marker on white >= 3:1.
 * Never put white text on a marker colour: NORMAL, ADVISORY and WARNING markers fail that on purpose (they are lighter).
 */
export const LEVEL_PALETTE: Record<Level, { text: string; tint: string; solid: string; marker: string }> = {
  NORMAL: { text: '#1E6B3A', tint: '#E5F5EA', solid: '#1E6B3A', marker: '#059669' },
  ADVISORY: { text: '#0B5394', tint: '#E6F0FA', solid: '#0B5394', marker: '#0284C7' },
  WARNING: { text: '#8A4B00', tint: '#FFF4E0', solid: '#8A4B00', marker: '#D97706' },
  DANGER: { text: '#B42318', tint: '#FDECEA', solid: '#B42318', marker: '#DC2626' },
};

interface LevelMeta {
  label: string;
  hex: string;
  icon: LucideIcon;
  chip: string;  // light pill: tinted background + dark text + border
  text: string;  // coloured text on white
  border: string;
  dot: string;
  solid: string; // saturated fill with a text colour that passes contrast
  soft: string;  // tinted card background
}

// Class strings are written out in full so Tailwind can see them at build time.
// Every text/background pair below is >= 4.5:1.
export const LEVEL_META: Record<Level, LevelMeta> = {
  NORMAL: {
    label: 'Normal', hex: LEVEL_PALETTE.NORMAL.marker, icon: CheckCircle2,
    chip: 'bg-normal-bg text-normal border-transparent', text: 'text-normal', border: 'border-normal',
    dot: 'bg-normal', solid: 'bg-normal text-white', soft: 'bg-normal-bg',
  },
  ADVISORY: {
    label: 'Advisory', hex: LEVEL_PALETTE.ADVISORY.marker, icon: Info,
    chip: 'bg-advisory-bg text-advisory border-transparent', text: 'text-advisory', border: 'border-advisory',
    dot: 'bg-advisory', solid: 'bg-advisory text-white', soft: 'bg-advisory-bg',
  },
  WARNING: {
    label: 'Warning', hex: LEVEL_PALETTE.WARNING.marker, icon: AlertTriangle,
    chip: 'bg-warning-bg text-warning border-transparent', text: 'text-warning', border: 'border-warning',
    dot: 'bg-warning', solid: 'bg-warning text-white', soft: 'bg-warning-bg',
  },
  DANGER: {
    label: 'Danger', hex: LEVEL_PALETTE.DANGER.marker, icon: Siren,
    chip: 'bg-danger-bg text-danger border-transparent', text: 'text-danger', border: 'border-danger',
    dot: 'bg-danger', solid: 'bg-danger text-white', soft: 'bg-danger-bg',
  },
};

/** Default thresholds, used only by the offline sample data. The server computes the real ones from calibration. */
export const SAMPLE_THRESHOLDS = { normal: 0.2, warning: 0.5, danger: 0.97 };

export function ratioToLevel(ratio: number, t = SAMPLE_THRESHOLDS): Level {
  if (ratio >= t.danger) return 'DANGER';
  if (ratio >= t.warning) return 'WARNING';
  if (ratio >= t.normal) return 'ADVISORY';
  return 'NORMAL';
}
