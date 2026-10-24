import React, { useRef, useState } from 'react';
import { useElementWidth } from '../../hooks/vision/useElementSize';
import { RefreshCw } from 'lucide-react';
import { useForecast } from '../../hooks/useForecast';
import type { ForecastResponse } from '../../services/api';
import { LEVEL_PALETTE } from '../../lib/vision/levels';
import { Skeleton } from '../live/shared/Skeleton';
import { btnSecondary, card, num } from '../../styles/tokens';

const H = 200;
const PAD = { l: 48, r: 14, t: 12, b: 30 };
const WARNING_M = 1.2;
const DANGER_M = 1.5;

/**
 * Forecast for the next two hours from the backend. HONESTY: the backend evaluates a hand-written formula on a
 * simulated starting level; it is not a trained or validated model, and no accuracy or confidence is shown. The label
 * is part of the component and cannot be hidden by a prop.
 */
export function ForecastTimeline() {
  const [liveRain, setLiveRain] = useState(false);
  const { state, retry } = useForecast(liveRain);

  return (
    <div className={`${card} grid gap-2.5 p-4`} aria-labelledby="forecast-title" role="group">
      <h3 id="forecast-title" className="sr-only">Forecast for the next 2 hours</h3>
      {state.status === 'loading' && <Skeleton className="h-48 w-full" />}

      {state.status === 'error' && (
        <div className="grid animate-shake gap-3" role="alert">
          <p className="text-sm">The forecast could not be loaded, so none is shown. We never show numbers the server did not produce.</p>
          <button type="button" onClick={retry} className={`${btnSecondary} justify-self-start`}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again</button>
        </div>
      )}

      {state.status === 'ready' && <Chart data={state.data} />}

      <details className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center text-link">Forecast settings</summary>
        <label className="flex min-h-11 cursor-pointer items-center gap-2">
          <input type="checkbox" checked={liveRain} onChange={(e) => setLiveRain(e.target.checked)} className="h-5 w-5" />
          Use live rain from Open-Meteo instead of the demo rate
        </label>
      </details>
      <p className="text-xs text-muted">Demo: a simple formula on a simulated starting level, not a trained model.</p>
    </div>
  );
}

function Chart({ data }: { data: ForecastResponse }) {
  const f = data.forecast;
  const box = useRef<HTMLDivElement>(null);
  const W = Math.max(260, useElementWidth(box)); // real pixels: text stays 12px or more at any width
  const maxT = Math.max(...f.horizons_min);
  const hi = Math.max(DANGER_M + 0.25, ...f.p90);
  const lo = Math.max(0, Math.min(...f.p10) - 0.1);
  const x = (t: number) => PAD.l + (t / maxT) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = (vals: number[]) => vals.map((v, i) => `${x(f.horizons_min[i]).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const band = `${line(f.p90)} ${f.horizons_min.map((t, i) => `${x(f.horizons_min[f.horizons_min.length - 1 - i]).toFixed(1)},${y(f.p10[f.p10.length - 1 - i]).toFixed(1)}`).join(' ')}`;
  const ticks = [0, 30, 60, 90, 120].filter((t) => t <= maxT);
  const danger = LEVEL_PALETTE.DANGER;
  const warning = LEVEL_PALETTE.WARNING;
  const toDanger = f.time_to_danger_min;

  return (
    <div ref={box}>
      <p className="text-[15px]/[1.4]">
        {toDanger !== null
          ? <>Likely to reach the danger line (<b className="tabular-nums">{DANGER_M.toFixed(2)} m</b>) in about <b className="tabular-nums">{toDanger} min</b>.</>
          : <>Likely to stay below the danger line (<b className="tabular-nums">{DANGER_M.toFixed(2)} m</b>) for the next 2 hours.</>}{' '}
        {(() => { const d = Math.round((f.p50[f.p50.length - 1] - data.water_level_m) * 100); return <>Level in 2 hours: about <b className="tabular-nums">{f.p50[f.p50.length - 1].toFixed(2)} m</b> ({d >= 0 ? '+' : ''}{d} cm).</>; })()}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full" role="img" aria-label={`Forecast of river level for the next two hours. Middle estimate rises from ${f.p50[0].toFixed(2)} to ${f.p50[f.p50.length - 1].toFixed(2)} metres. Simulated.`}>
        {[WARNING_M, DANGER_M].map((v, i) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={i ? danger.marker : warning.marker} strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill={i ? danger.text : warning.text}>{v.toFixed(2)}</text>
          </g>
        ))}
        <polygon points={band} fill="#1d5fbf" fillOpacity="0.14" />
        <polyline points={line(f.p50)} fill="none" stroke="#1d5fbf" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor={t === maxT ? 'end' : t === 0 ? 'start' : 'middle'} fontSize="12" fill="#5c6370">{t === 0 ? 'now' : `+${t}m`}</text>
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-water" aria-hidden="true" /> Likely level</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded bg-water/15" aria-hidden="true" /> Could range from {Math.min(...f.p10).toFixed(2)} to {Math.max(...f.p90).toFixed(2)} m</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ backgroundColor: warning.marker }} aria-hidden="true" /> {WARNING_M.toFixed(2)} m warning</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ backgroundColor: danger.marker }} aria-hidden="true" /> {DANGER_M.toFixed(2)} m danger</span>
      </div>
      {data.weather && data.weather.warnings.length > 0 && (
        <p role="status" className="rounded-ctl bg-warning-bg px-3 py-2 text-xs font-medium text-warning">
          {data.weather.warnings_source}: {data.weather.warnings.map((w) => w.title).join('; ')}
        </p>
      )}
          </div>
  );
}
