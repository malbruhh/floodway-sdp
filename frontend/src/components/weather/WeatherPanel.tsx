import { CloudRain, Droplets, TriangleAlert, Wind } from 'lucide-react';
import { useWeatherDetail } from '../../hooks/useWeatherDetail';
import { RAIN_LABEL, rainClass } from '../../lib/weather';

const hour = (t: string) => t.slice(11, 16);

/** Weather at the focused camera: now, next 6 hours, and official warnings where we can check them. Modelled data, labelled so. */
export function WeatherPanel({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const s = useWeatherDetail(lat, lon);
  return (
    <section aria-label={`Weather at ${name}`} className="rounded-card border border-line bg-surface p-3 text-sm/5 text-ink">
      <h3 className="flex items-center gap-2 text-sm/5 font-bold text-ink"><CloudRain className="h-4 w-4 text-muted" aria-hidden="true" /> Weather at this camera</h3>
      {s.status === 'loading' && <p className="mt-2 text-xs/4 text-muted">Loading weather…</p>}
      {s.status === 'error' && <p role="status" className="mt-2 text-xs/4 text-muted">Weather could not be loaded, so none is shown.</p>}
      {s.status === 'ready' && (() => {
        const w = s.data;
        const max = Math.max(1, ...w.next_hours.map((h) => h.mm));
        return (
          <>
            <p className="mt-1"><b>{w.sky}</b> · {RAIN_LABEL[rainClass(w.rate_mm_hr)]}{w.rate_mm_hr >= 0.1 && ` ${w.rate_mm_hr.toFixed(1)} mm/h`}{w.temp_c !== null && ` · ${Math.round(w.temp_c)}°C`}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs/4 text-muted">
              {w.humidity_pct !== null && <span className="inline-flex items-center gap-1"><Droplets className="h-3.5 w-3.5" aria-hidden="true" /> {w.humidity_pct}% humidity</span>}
              {w.wind_kmh !== null && <span className="inline-flex items-center gap-1"><Wind className="h-3.5 w-3.5" aria-hidden="true" /> {Math.round(w.wind_kmh)} km/h{w.gust_kmh !== null && `, gusts ${Math.round(w.gust_kmh)}`}</span>}
            </p>
            <ol className="mt-2 flex items-end gap-1.5" aria-label="Rain each hour for the next 6 hours">
              {w.next_hours.map((h) => (
                <li key={h.time} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-xs/4 text-muted">
                  <span className="tabular-nums">{h.mm.toFixed(1)}</span>
                  <span className="w-full rounded bg-water/70" style={{ height: `${Math.max(3, (h.mm / max) * 32)}px` }} aria-hidden="true" />
                  <span className="tabular-nums">{hour(h.time)}</span>
                  {h.chance_pct !== null && <span className="tabular-nums text-muted">{h.chance_pct}%</span>}
                </li>
              ))}
            </ol>
            <p className="mt-1 text-xs/4 text-muted">mm per hour, then chance of rain.</p>
            {w.warnings.length > 0 && (
              <p role="status" className="mt-2 flex items-start gap-2 rounded-ctl bg-warning-bg px-3 py-2 text-xs/4 font-medium text-warning ring-1 ring-amber-200">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {w.warnings_source}: {w.warnings.map((x) => x.title).join('; ')}
              </p>
            )}
            <p className="mt-2 text-xs/4 text-muted">{w.source}.{!w.warnings_covered && ' Official warnings are checked only for Selangor and Kuala Lumpur.'}</p>
          </>
        );
      })()}
    </section>
  );
}
