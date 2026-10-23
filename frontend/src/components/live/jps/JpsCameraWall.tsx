import { useMemo, useState } from 'react';
import { AlertTriangle, Camera, ImageOff } from 'lucide-react';
import { JPS_LABEL, JPS_STATUS, ageText, type JpsCamera } from '../../../lib/jps';
import { jpsImageUrl } from '../../../services/jps';
import { useJpsCameras } from '../../../hooks/useJpsCameras';
import { DistrictMenu } from './DistrictMenu';
import { WeatherPanel } from '../../weather/WeatherPanel';
import { WeatherChip } from '../../weather/WeatherChip';
import { useWeather } from '../../../hooks/useWeather';
import { weatherKey, type PointWeather } from '../../../services/weather';

const PAGE = 24;

function Card({ cam, wx }: { cam: JpsCamera; wx: PointWeather | undefined }) {
  const [broken, setBroken] = useState(false);
  const [open, setOpen] = useState(false);
  const s = JPS_STATUS[cam.status];
  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-video bg-slate-100">
        {broken ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-slate-500">
            <ImageOff className="h-5 w-5" aria-hidden="true" /> Snapshot unavailable
          </div>
        ) : (
          <img src={jpsImageUrl(cam)} alt={`Latest JPS snapshot: ${cam.name}`} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        )}
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${s.chip}`}>{s.label}</span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-bold text-slate-900">{cam.name}</p>
        <p className="truncate text-xs text-slate-600">
          {cam.district}
          {cam.river_basin ? ` · ${cam.river_basin}` : ''}
        </p>
        <p className="mt-1 text-xs text-slate-600">Updated {ageText(cam.age_s)}</p>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1 flex min-h-11 items-center gap-2 text-left">
          <WeatherChip w={wx} /> <span className="text-xs font-semibold text-[#0958D9]">{open ? 'Hide weather' : 'Weather details'}</span>
        </button>
        {open && <WeatherPanel lat={cam.lat} lon={cam.lon} name={cam.name} />}
        <p className="mt-1 text-xs font-medium text-slate-500">Image only, no AI reading</p>
      </div>
    </li>
  );
}

export function JpsCameraWall() {
  const { data, loading, error } = useJpsCameras();
  const [district, setDistrict] = useState('all');
  const [shown, setShown] = useState(PAGE);

  // Same districts as the JPS Selangor site; the wall runs district by district, then camera name A to Z.
  const cmp = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
  const cameras = useMemo(() => [...(data?.cameras ?? [])].sort((a, b) => cmp(a.district, b.district) || cmp(a.name, b.name)), [data]);
  const districts = useMemo(() => Array.from(new Set(cameras.map((c) => c.district))), [cameras]);
  const visible = cameras.filter((c) => district === 'all' || c.district === district);
  const weather = useWeather(visible.slice(0, shown));
  const counts = { online: 0, stale: 0, offline: 0 };
  for (const c of visible) counts[c.status] += 1;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 lg:px-8" aria-labelledby="jps-title">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="jps-title" className="flex items-center gap-2 font-heading text-xl font-extrabold text-slate-900">
          <Camera className="h-5 w-5 text-[#1677FF]" aria-hidden="true" /> Selangor river cameras
        </h2>
        <DistrictMenu
          value={district}
          total={cameras.length}
          districts={districts.map((d) => ({ name: d, count: cameras.filter((c) => c.district === d).length }))}
          onChange={(d) => {
            setDistrict(d);
            setShown(PAGE);
          }}
        />
      </div>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">{JPS_LABEL} Photos refresh about every 1 to 2 minutes; this page checks every 2 minutes.</p>

      {data && (
        <p className="mt-3 text-xs text-slate-600">
          {counts.online} online · {counts.stale} stale · {counts.offline} offline
        </p>
      )}
      {(error || data?.stale) && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {data?.stale ? 'JPS Selangor did not answer; showing the last list we received.' : error}
        </p>
      )}
      {loading && <p className="mt-6 text-sm text-slate-600">Loading cameras…</p>}
      {!loading && !data && <p className="mt-6 text-sm text-slate-700">Could not load the JPS camera list. Check that the backend is running.</p>}

      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.slice(0, shown).map((c) => (
          <Card key={c.id} cam={c} wx={weather[weatherKey(c.lat, c.lon)]} />
        ))}
      </ul>
      {visible.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE)} className="mt-5 min-h-11 rounded-xl bg-[#1677FF] px-5 text-sm font-bold text-white">
          Show more ({visible.length - shown} left)
        </button>
      )}
    </section>
  );
}
