import { clockTime } from '../../../lib/vision/format';
import { LEVEL_META } from '../../../lib/vision/levels';
import { thresholdsFromCalibration } from '../../../lib/vision/thresholds';
import type { Calibration, Reading } from '../../../types/vision';
import { num } from '../shared/ui';

interface Props {
  history: Reading[];
  calibration: Calibration;
}

const W = 320;
const H = 120;
const MAX = 1.2;
const LINES = [
  { key: 'danger', label: 'Danger', color: '#DC2626' },
  { key: 'warning', label: 'Warning', color: '#D97706' },
  { key: 'normal', label: 'Normal', color: '#059669' },
] as const;

/** Hand-drawn SVG, no chart library. Labels sit outside the SVG so they never scale below 12px. */
export function LevelHistoryChart({ history, calibration }: Props) {
  const t = thresholdsFromCalibration(calibration);
  const y = (v: number) => H - 6 - (Math.min(v, MAX) / MAX) * (H - 14);
  const data = history.slice(-30);
  const x = (i: number) => (data.length < 2 ? W : (i / (data.length - 1)) * (W - 8) + 4);
  const last = data[data.length - 1];
  const color = last ? LEVEL_META[last.level].hex : LEVEL_META.ADVISORY.hex;
  const points = data.map((r, i) => `${x(i).toFixed(1)},${y(r.water_ratio).toFixed(1)}`).join(' ');

  return (
    <figure>
      <figcaption className="mb-2 flex items-center justify-between text-sm/5">
        <span className="font-semibold text-ink">Level history</span>
        <span className="text-xs/4 text-muted">{data.length ? `last ${data.length} readings` : 'Collecting…'}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-28 w-full rounded-lg bg-slate-50" role="img" aria-label={`Water level over the last ${data.length} readings against the normal, warning and danger lines`}>
        {LINES.map((l) => (
          <line key={l.key} x1={0} x2={W} y1={y(t[l.key])} y2={y(t[l.key])} stroke={l.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.8} vectorEffect="non-scaling-stroke" />
        ))}
        {data.length > 1 && <polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs/4 text-muted">
        <span className="flex items-center gap-3">
          {LINES.map((l) => (
            <span key={l.key} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: l.color }} aria-hidden="true" />
              {l.label}
            </span>
          ))}
        </span>
        {last && <span>Latest <span className={num}>{clockTime(last.timestamp)}</span> · {last.trend}</span>}
      </div>
    </figure>
  );
}
