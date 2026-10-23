import { Loader2 } from 'lucide-react';
import { pct } from '../../../lib/vision/format';
import type { Reading } from '../../../types/vision';
import { JsonOutputCard } from '../analysis/JsonOutputCard';
import { StatusChip } from '../shared/StatusChip';
import { btnSecondary } from '../shared/ui';

interface Props {
  loading: boolean;
  error: string | null;
  reading: Reading | null;
  offlineSample: boolean;
  onRetry: () => void;
}

export function StepTest({ loading, error, reading, offlineSample, onRetry }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-link motion-reduce:animate-none" aria-hidden="true" />
        <p className="font-semibold text-ink">Analysing a short burst of frames…</p>
        <p className="text-sm text-muted">This takes a few seconds.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert" className="rounded-ctl border border-transparent bg-danger-bg px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
        <button type="button" onClick={onRetry} className={btnSecondary}>
          Try again
        </button>
      </div>
    );
  }
  if (!reading) return null;
  return (
    <div className="space-y-3">
      {offlineSample && <p className="rounded-ctl bg-warning-bg px-3 py-2 text-sm font-semibold text-warning">Offline sample result. Connect the backend to run a real test.</p>}
      <div className="flex items-center justify-between rounded-ctl border border-line p-3">
        <div>
          <p className="text-sm text-muted">Water at</p>
          <p className="text-3xl font-bold text-ink">{pct(reading.water_ratio)} <span className="text-base font-semibold text-muted">up the bank</span></p>
        </div>
        <div className="text-right">
          <StatusChip level={reading.level} size="md" />
          <p className="mt-1 font-mono text-xs text-muted">confidence {Math.round(reading.confidence * 100)}%</p>
        </div>
      </div>
      {reading.low_confidence && <p className="text-sm font-semibold text-amber-800">Low confidence. Check that the zone covers only water and the lines match the bank, then test again.</p>}
      <JsonOutputCard reading={reading} />
    </div>
  );
}
