import { Cloud, CloudRain } from 'lucide-react';
import { RAIN_LABEL, rainClass } from '../../lib/weather';
import type { PointWeather } from '../../services/weather';

/** Rain and temperature at a camera's position. Modelled on a grid of roughly 10 km, so the title says so. */
export function WeatherChip({ w }: { w: PointWeather | undefined }) {
  if (!w) return null;
  const cls = rainClass(w.rate_mm_hr);
  const Icon = cls === 'none' ? Cloud : CloudRain;
  const tone = cls === 'heavy' ? 'bg-red-50 text-red-900 ring-red-200' : cls === 'moderate' ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-slate-100 text-slate-800 ring-slate-200';
  const text = `${RAIN_LABEL[cls]}${cls === 'none' ? '' : ` ${w.rate_mm_hr.toFixed(1)} mm/h`}${w.temp_c === null ? '' : ` · ${Math.round(w.temp_c)}°C`}`;
  return (
    <span title={`${w.source}${w.observed_at ? `, ${w.observed_at}` : ''}`} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs/4 font-medium ring-1 ${tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {text}
    </span>
  );
}
