import React, { useRef } from 'react';
import { useElementWidth } from '../../hooks/vision/useElementSize';
import { RefreshCw, Waypoints } from 'lucide-react';
import { useForecast } from '../../hooks/useForecast';
import type { ForecastResponse } from '../../services/api';
import { LEVEL_PALETTE } from '../../lib/vision/levels';
import { Skeleton } from '../live/shared/Skeleton';
import { btnSecondary, card, cardPad, cardTitle, num } from '../../styles/tokens';

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
  const { state, retry } = useForecast();

  return (
    <section className={`${card} ${cardPad}`} aria-labelledby="forecast-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id="forecast-title" className={`${cardTitle} flex items-center gap-2`}>
          <Waypoints className="h-5 w-5 text-slate-600" aria-hidden="true" /> Forecast, next 2 hours
        </h2>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs/4 font-semibold text-amber-900">Simulated · rule-based estimate, not a trained model</span>
      </div>

      {state.status === 'loading' && <Skeleton className="mt-3 h-48 w-full" />}

      {state.status === 'error' && (
        <div className="mt-3 flex flex-col items-start gap-3 rounded-xl border border-dashed border-slate-300 p-5" role="alert">
          <p className="text-sm/5 text-slate-800">The forecast could not be loaded from the server, so none is shown. We never show forecast numbers the server did not produce.</p>
          <button type="button" onClick={retry} className={btnSecondary}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again</button>
        </div>
      )}

      {state.status === 'ready' && <Chart data={state.data} />}
    </section>
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
    <div className="mt-3" ref={box}>
      <p className="text-sm/5 text-slate-800">
        {toDanger !== null
          ? <>In this simulation the level reaches <b className="tabular-nums">{DANGER_M.toFixed(2)} m</b> in about <b className="tabular-nums">{toDanger} min</b>.</>
          : <>In this simulation the level stays below <b className="tabular-nums">{DANGER_M.toFixed(2)} m</b> for the next 2 hours.</>}{' '}
        Starting level <span className={num}>{data.water_level_m.toFixed(2)} m</span> is a seeded demo value, not a live sensor reading.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mt-3 block w-full" role="img" aria-label={`Forecast of river level for the next two hours. Middle estimate rises from ${f.p50[0].toFixed(2)} to ${f.p50[f.p50.length - 1].toFixed(2)} metres. Simulated.`}>
        {[WARNING_M, DANGER_M].map((v, i) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={i ? danger.marker : warning.marker} strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill={i ? danger.text : warning.text}>{v.toFixed(2)}</text>
          </g>
        ))}
        <polygon points={band} fill="#0284C7" fillOpacity="0.14" />
        <polyline points={line(f.p50)} fill="none" stroke="#0369A1" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor={t === maxT ? 'end' : t === 0 ? 'start' : 'middle'} fontSize="12" fill="#334155">{t === 0 ? 'now' : `+${t}m`}</text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs/4 text-slate-700">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#0369A1]" aria-hidden="true" /> Middle estimate (P50)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded bg-sky-600/20" aria-hidden="true" /> Range (P10 to P90)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ backgroundColor: warning.marker }} aria-hidden="true" /> {WARNING_M.toFixed(2)} m warning</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ backgroundColor: danger.marker }} aria-hidden="true" /> {DANGER_M.toFixed(2)} m danger</span>
      </div>
      <p className="mt-2 text-xs/4 text-slate-700">{f.method ?? f.source}</p>
    </div>
  );
}
