import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Video } from 'lucide-react';
import { isSampleCamera } from '../../lib/home';
import { pct } from '../../lib/vision/format';
import { levelRank } from '../../lib/vision/levels';
import type { Camera } from '../../types/vision';
import { FeedThumb } from '../live/feed/FeedThumb';
import { EmptyState } from '../live/shared/EmptyState';
import { Skeleton } from '../live/shared/Skeleton';
import { OfflineChip, StatusChip } from '../live/shared/StatusChip';
import { WeatherPanel } from '../weather/WeatherPanel';
import { WeatherChip } from '../weather/WeatherChip';
import { useWeather } from '../../hooks/useWeather';
import { weatherKey } from '../../services/weather';
import { card, cardPad, cardTitle, interactive, num } from '../../styles/tokens';

interface Props {
  loading: boolean;
  cameras: Camera[];
  /** built-in sample scenes instead of server frames (server unreachable) */
  useScene: boolean;
}

/** Most urgent first. Every sample camera carries a SAMPLE badge. */
export function CameraStatusRow({ loading, cameras, useScene }: Props) {
  const sorted = [...cameras].sort((a, b) => {
    const la = a.online && a.reading ? levelRank(a.reading.level) : -1;
    const lb = b.online && b.reading ? levelRank(b.reading.level) : -1;
    return lb - la || a.name.localeCompare(b.name);
  });

  const weather = useWeather(cameras);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focused = sorted.find((c) => c.id === focusId) ?? sorted[0]; // the most urgent camera until another is hovered or focused

  return (
    <section className={`${card} ${cardPad}`} aria-labelledby="cams-row-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cams-row-title" className={`${cardTitle} flex items-center gap-2`}>
          <Video className="h-5 w-5 text-slate-600" aria-hidden="true" /> Cameras
        </h2>
        <Link to="/live" className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-[#0958D9] hover:bg-blue-50 ${interactive}`}>
          Open Live Vision <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-3 flex gap-3 overflow-hidden">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-44 shrink-0" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="mt-3"><EmptyState icon={Video} title="No cameras yet" hint="Add a camera in Live Vision and it appears here." /></div>
      ) : (
        <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] md:-mx-5 md:px-5">
          {sorted.map((c) => {
            const reading = c.online ? c.reading : null;
            const sample = isSampleCamera(c);
            return (
              <li key={c.id} className="w-44 shrink-0 snap-start" onMouseEnter={() => setFocusId(c.id)} onFocus={() => setFocusId(c.id)}>
                <Link to="/live" className={`block rounded-xl border border-slate-200 bg-white p-2 hover:border-slate-300 ${interactive}`}>
                  <span className="relative block">
                    <FeedThumb camera={c} useScene={useScene} />
                    {sample && <span className="absolute left-1.5 top-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-xs/4 font-bold text-slate-950 ring-1 ring-black/20">SAMPLE</span>}
                  </span>
                  <span className="mt-2 block truncate text-sm/5 font-semibold text-slate-900" title={c.name}>{c.name}</span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    {reading ? <StatusChip level={reading.level} /> : <OfflineChip label={c.online ? 'WAITING' : 'OFFLINE'} />}
                    <span className={`${num} text-xs/4 font-semibold text-slate-800`}>{reading ? pct(reading.water_ratio) : '--'}</span>
                  </span>
                  <span className="mt-1 block"><WeatherChip w={weather[weatherKey(c.lat, c.lon)]} /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {focused && <div className="mt-3"><WeatherPanel lat={focused.lat} lon={focused.lon} name={focused.name} /></div>}
    </section>
  );
}
