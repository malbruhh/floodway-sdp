import { Navigation, ShieldCheck } from 'lucide-react';
import { formatMin } from '../../lib/format';

interface Props {
  instruction: string;
  /** Metres to the next manoeuvre. */
  toNextM: number;
  remainingM: number;
  remainingMin: number;
  progress: number;
  speedup: number;
  onCancel: () => void;
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`);

/** Turn-by-turn banner. The steps come from the road route; the drive itself is a sped-up simulation, and says so. */
export function NavigationHud({ instruction, toNextM, remainingM, remainingMin, progress, speedup, onCancel }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-1/2 top-3 z-[700] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-card border border-action bg-slate-950/95 p-3 text-white shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-action">
          <Navigation className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight">{fmtDist(toNextM)}</p>
          <p className="truncate text-sm font-semibold text-slate-100">{instruction}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-bold text-red-300 underline hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Cancel
        </button>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-300">
        <span className="font-semibold text-emerald-300">
          {fmtDist(remainingM)} · ~{formatMin(remainingMin)} left
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Simulated drive, {Math.round(speedup)}× speed
        </span>
      </div>
    </div>
  );
}
