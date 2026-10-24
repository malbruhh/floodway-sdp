import type { CycleState } from '../../../hooks/vision/useCaptureCycle';
import { num } from '../shared/ui';

interface Props {
  cycle: CycleState;
  size?: number;
}

/** Circular countdown: seconds in the middle while waiting, a turning arc while analysing. */
export function CountdownRing({ cycle, size = 44 }: Props) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const analysing = cycle.phase === 'analysing';
  const dim = cycle.phase === 'offline' || cycle.phase === 'stale' || cycle.phase === 'disconnected';
  const dash = analysing ? c * 0.28 : c * Math.max(0, Math.min(1, cycle.progress));
  const label = analysing ? 'Analysing now' : dim ? 'No countdown' : `${cycle.secondsLeft} seconds to next capture`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={analysing ? 'motion-safe:animate-spin' : '-rotate-90'} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dim ? '#94A3B8' : '#141414'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} className="transition-[stroke-dasharray] duration-300 ease-linear motion-reduce:transition-none" />
      </svg>
      {!analysing && <span className={`${num} absolute inset-0 flex items-center justify-center text-xs/4 font-semibold text-ink`}>{dim ? '--' : `${cycle.secondsLeft}s`}</span>}
    </div>
  );
}
