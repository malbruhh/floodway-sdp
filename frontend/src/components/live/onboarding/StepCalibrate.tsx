import { Redo2, RotateCcw, Undo2 } from 'lucide-react';
import { linesAreValid } from '../../../lib/vision/thresholds';
import type { Calibration } from '../../../types/vision';
import { focusRing } from '../shared/ui';
import { CalibrationCanvas } from './CalibrationCanvas';

export const DEFAULT_LINES = { normal: 0.8, warning: 0.62, danger: 0.38 };
/** A sensible starting rectangle so users on a phone can just nudge it instead of tapping every corner. */
export const STARTER_ROI: [number, number][] = [[0.2, 0.3], [0.8, 0.3], [0.8, 0.92], [0.2, 0.92]];

interface Props {
  imageUrl: string | null;
  value: Calibration;
  onChange: (next: Calibration) => void;
}

const tool = `inline-flex min-h-11 items-center gap-1.5 rounded-ctl border border-control bg-surface px-3 text-sm font-bold text-ink hover:bg-slate-50 disabled:opacity-50 ${focusRing}`;

export function StepCalibrate({ imageUrl, value, onChange }: Props) {
  const valid = linesAreValid(value);
  return (
    <div className="space-y-3">
      <CalibrationCanvas imageUrl={imageUrl} value={value} onChange={onChange} />
      <p className="rounded-ctl bg-blue-50 px-3 py-2 text-sm/5 text-ink">
        Drag <b>Danger</b> to the top of the bank, <b>Normal</b> to the usual water level, <b>Warning</b> between. Outline only the water.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={tool} disabled={value.roi.length === 0} onClick={() => onChange({ ...value, roi: value.roi.slice(0, -1) })}>
          <Undo2 className="h-4 w-4" aria-hidden="true" /> Undo
        </button>
        <button type="button" className={tool} onClick={() => onChange({ roi: [], lines: DEFAULT_LINES })}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
        </button>
        <button type="button" className={tool} onClick={() => onChange({ ...value, roi: STARTER_ROI })}>
          <Redo2 className="h-4 w-4" aria-hidden="true" /> Use a starter zone
        </button>
      </div>
      {!valid && (
        <p role="status" className="text-sm font-semibold text-amber-800">
          {value.roi.length < 3 ? 'Add at least 3 points to outline the water zone.' : 'Keep the Normal line inside the zone, with Danger above Warning above Normal.'}
        </p>
      )}
    </div>
  );
}
