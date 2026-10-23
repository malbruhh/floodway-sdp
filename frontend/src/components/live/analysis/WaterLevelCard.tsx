import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Waves } from 'lucide-react';
import { describeReading } from '../../../lib/vision/describe';
import { clockTime, pct, timeAgo } from '../../../lib/vision/format';
import { levelSince } from '../../../lib/vision/history';
import { LEVEL_META } from '../../../lib/vision/levels';
import { thresholdsFromCalibration } from '../../../lib/vision/thresholds';
import type { Camera, Reading } from '../../../types/vision';
import { StatusChip } from '../shared/StatusChip';
import { card, cardPad, cardTitle, hero, label, num } from '../shared/ui';

const REF = [
  { key: 'danger', label: 'Danger line', note: 'up the bank: the top', dot: 'bg-danger' },
  { key: 'warning', label: 'Warning line', note: 'up the bank: high water', dot: 'bg-warning-bg0' },
  { key: 'normal', label: 'Normal line', note: 'up the bank: usual level', dot: 'bg-emerald-600' },
] as const;

const TREND = {
  rising: { icon: ArrowUpRight, word: 'Rising', cls: 'text-danger' },
  steady: { icon: ArrowRight, word: 'Steady', cls: 'text-muted' },
  falling: { icon: ArrowDownRight, word: 'Falling', cls: 'text-normal' },
} as const;

function Title() {
  return (
    <h3 className={`${cardTitle} flex items-center gap-2`}>
      <Waves className="h-5 w-5 text-link" aria-hidden="true" /> Water level
    </h3>
  );
}

export function WaterLevelCard({ camera, history }: { camera: Camera; history: Reading[] }) {
  const reading = camera.reading;
  const t = thresholdsFromCalibration(camera.calibration);

  if (!camera.online || !reading) {
    return (
      <section className={`${card} ${cardPad}`}>
        <Title />
        <p className="mt-4 text-sm/5 font-semibold text-ink">{camera.online ? 'Waiting for the first analysis…' : 'No reading: camera offline'}</p>
        <p className="mt-1 max-w-[60ch] text-sm/5 text-muted">{camera.online ? 'The first result appears after the first capture cycle.' : 'The last level is hidden because it may be out of date.'}</p>
      </section>
    );
  }

  const meta = LEVEL_META[reading.level];
  const trend = TREND[reading.trend];
  const TrendIcon = trend.icon;
  const fill = Math.min(100, Math.round(reading.water_ratio * 100));
  const conf = Math.round(reading.confidence * 100);
  const since = levelSince(history);

  return (
    <section className={`${card} ${cardPad} ${reading.level === 'DANGER' ? 'border-red-400 motion-safe:animate-[live-danger-border_2s_ease-in-out_infinite]' : ''}`} aria-labelledby="wl-title">
      <div className="flex items-center justify-between gap-3">
        <span id="wl-title"><Title /></span>
        <StatusChip level={reading.level} size="md" />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="flex items-baseline gap-2">
          <span className={hero}>{pct(reading.water_ratio)}</span>
          <span className="text-sm/5 text-muted">of the way up the river bank</span>
        </p>
        <p className={`flex items-center gap-1 pb-1.5 text-sm/5 font-semibold ${trend.cls}`}>
          <TrendIcon className="h-4 w-4" aria-hidden="true" /> {trend.word}
        </p>
      </div>

      <div className="relative mt-3 h-2.5 rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill} aria-valuetext={`${fill}% of the way up the river bank, ${meta.label}`} aria-label="Water level">
        <div className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${fill}%`, backgroundColor: meta.hex }} />
        {([['normal', t.normal], ['warning', t.warning]] as const).map(([k, v]) => (
          <span key={k} className="absolute -top-0.5 h-3.5 w-0.5 rounded-full bg-slate-500" style={{ left: `${Math.min(100, v * 100)}%` }} aria-hidden="true" />
        ))}
      </div>

      <p className="mt-3 max-w-[60ch] text-sm/5 text-muted">{describeReading(reading)}</p>
      <p className={`${label} mt-2`}>
        {since ? <>{meta.label} since <span className={num}>{clockTime(since)}</span> ({timeAgo(since)})</> : <>{meta.label} for all recent readings</>}
      </p>

      <div className="mt-4 border-t border-rule pt-3">
        <h4 className="text-sm/5 font-semibold text-ink">Lines drawn on the photo</h4>
        <ul className="mt-2 space-y-1.5 text-sm/5">
          {REF.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ink">
                <span className={`h-2.5 w-2.5 rounded-full ${r.dot}`} aria-hidden="true" />
                {r.label}
              </span>
              <span className="text-muted">
                <span className={`${num} text-ink`}>~{Math.round(t[r.key] * 100)}%</span> {r.note}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-rule pt-3">
        <div className="flex items-center justify-between text-sm/5">
          <span className="text-muted">How sure the AI is</span>
          <span className={`${num} font-semibold text-ink`}>{conf}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={conf} aria-label="AI confidence">
          <div className="h-full rounded-full bg-action" style={{ width: `${conf}%` }} />
        </div>
        {reading.low_confidence && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-warning-bg px-2 py-1 text-xs/4 font-semibold text-warning">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> The AI is not sure about this reading. Treat it with care.
          </p>
        )}
        <p className={`${label} mt-2`}>The level only drops after 3 safe readings in a row.</p>
      </div>
    </section>
  );
}
